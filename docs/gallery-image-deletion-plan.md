# Gallery Image Deletion Plan

## Problem

Deleting an image from the admin Gallery page currently calls the global image asset deletion endpoint:

- UI: `packages/ui/src/pages/admin/AdminGalleryPage/AdminGalleryPage.tsx`
- Hook/client: `packages/ui/src/api/rest/hooks.ts`, `packages/ui/src/api/rest/client.ts`
- Server route: `packages/server/src/rest/images.ts`

That endpoint protects shared image assets. Before deleting files and the `image` record, it checks whether the image is referenced by plants or any image labels. Gallery membership is represented as an `image_labels` row with `label = "gallery"`, so an image shown in the gallery is considered in use and normal deletion returns:

```json
{
  "error": "Cannot delete image while in use",
  "usage": {
    "usedInPlants": [],
    "usedInLabels": ["gallery"],
    "warnings": ["Image has 1 other label(s): gallery"]
  },
  "hint": "Remove image from all galleries/labels first, or add ?force=true to force deletion"
}
```

The guard is correct for permanent asset deletion, but it is the wrong operation for the Gallery page. In that context, the admin intent is "remove this image from the gallery." The admin should not need to understand image labels, plant references, retention cleanup, or `force=true`.

## Current Behavior And Constraints

### Data Model

Relevant Prisma models live in `packages/server/src/db/schema.prisma`:

- `image.hash` is the logical asset identity.
- `image.files` are generated file variants.
- `image.image_labels` stores usage labels such as `gallery`, `hero-banner`, and `seasonal`.
- `image.plant_images` stores plant-to-image relations.
- `image.unlabeled_since` is used by cleanup retention for images with no labels and no plant relations.
- `image_labels` has `@@unique([hash, label])`, and `index` stores ordering within a label.
- Deleting an `image` cascades to `image_file`, `image_labels`, and `plant_images`.

### Existing Image Operations

`GET /api/rest/v1/images?label=gallery`

- Lists images that have the `gallery` label.
- Sorts by the `image_labels.index` value for that label.

`POST /api/rest/v1/images`

- Uploads images.
- Adds labels passed in the form data.
- If labels are present, clears `unlabeled_since`; otherwise sets it.

`PUT /api/rest/v1/images`

- Updates image metadata.
- Updates `image_labels.index` for provided `{ hash, label }` entries.
- Does not remove labels for omitted images.

`DELETE /api/rest/v1/images/:hash`

- Checks usage with `checkImageUsage`.
- Blocks if the image has any plant usage or labels unless `?force=true`.
- With `force=true`, deletes files first and then deletes the `image` record.

`GET /api/rest/v1/images/:hash/usage`

- Reports plant and label usage.

### Existing Cleanup Behavior

Storage stats and cleanup already treat an image as cleanup-eligible only when both are true:

- `image_labels: { none: {} }`
- `plant_images: { none: {} }`

For retention cleanup, `unlabeled_since` must also be older than the configured retention window.

This means the desired Gallery behavior can safely remove the `gallery` label and then:

- keep the asset if any other relation remains;
- mark it as unlabeled if no relation remains;
- allow existing cleanup policy to eventually delete the asset.

## Target Product Behavior

### Gallery Page

The Gallery page trash action should mean:

> Remove this image from the public gallery.

It should:

- remove only the `gallery` label relation for that image;
- reindex the remaining gallery images so ordering remains contiguous and deterministic;
- leave the underlying image files and `image` record intact if the asset is used elsewhere;
- mark `unlabeled_since` when the image has no remaining labels and no plant relations;
- refetch the gallery list and show a success message.

It should not:

- call permanent image deletion by default;
- require `force=true`;
- expose label implementation details to the admin;
- delete plant, hero banner, seasonal, or other non-gallery references.

### Permanent Image Deletion

The existing asset deletion endpoint should remain a separate destructive operation:

> Permanently delete this image asset and all generated variants.

It should continue to block when the image is in use unless explicitly forced from a context that is designed for destructive asset cleanup, such as storage management.

## Recommended API Design

Add a context-specific relation removal endpoint.

Preferred route:

```http
DELETE /api/rest/v1/images/:hash/labels/:label
```

For the immediate Gallery use case, call it with:

```http
DELETE /api/rest/v1/images/:hash/labels/gallery
```

Reasons:

- It directly models the operation: remove this image from this label collection.
- It can be reused by future label-backed admin pages.
- It avoids overloading global asset deletion.
- It preserves the existing `DELETE /images/:hash` safety semantics.

Alternative route:

```http
DELETE /api/rest/v1/gallery/images/:hash
```

This is more product-specific and easier to read from the Gallery UI, but it introduces a gallery-specific route family when the backend currently exposes label-backed image collection operations under `/images`.

Recommendation: use `DELETE /images/:hash/labels/:label`, but restrict allowed labels to known `IMAGE_LABELS` values server-side.

## Backend Implementation Plan

### 1. Add Shared Route And Contract

Files:

- `packages/shared/src/api/routes.ts`
- `packages/shared/src/api/contracts.ts`
- `packages/shared/src/api/contracts.test.ts`

Add:

```ts
REST_ROUTES.images.label = (hash = ":hash", label = ":label") =>
    `${REST_API_PREFIX}${REST_RESOURCE.Images}/${hash}/labels/${label}`;
```

Add contract:

```ts
removeLabel: (hash = ":hash", label = ":label") =>
    endpoint<
        never,
        {
            success: boolean;
            hash: string;
            removedLabel: ImageLabel;
            remainingLabels: string[];
            remainingPlantUsage: number;
            unlabeled: boolean;
            message: string;
        }
    >("DELETE", REST_ROUTES.images.label(hash, label));
```

Use the project's existing type/export style. If `ImageLabel` is not convenient in `contracts.ts`, use `string` in the response and validate on the server.

Update contract tests to assert the new path shape.

### 2. Add A Server Utility For Relation Removal

Recommended new utility:

- `packages/server/src/utils/imageLabels.ts`

Or add to an existing image utility module if that matches local conventions.

Function shape:

```ts
export async function removeImageLabelRelation(input: {
    hash: string;
    label: ImageLabel;
}): Promise<{
    exists: boolean;
    removed: boolean;
    remainingLabels: string[];
    remainingPlantUsage: number;
    unlabeled: boolean;
}>;
```

Behavior:

1. Validate image exists.
2. Delete only `image_labels` row matching `{ hash, label }`.
3. Reindex all remaining rows for that label by current `index`, then stable fallback such as `id`.
4. Count remaining labels for the image.
5. Count remaining plant relations for the image.
6. If both counts are zero, set `image.unlabeled_since = new Date()`.
7. If either count is nonzero, set `image.unlabeled_since = null` to avoid cleanup of an actively used asset.

Use `prisma.$transaction` so deletion, reindexing, and `unlabeled_since` update are atomic.

Important details:

- Treat deleting a missing label from an existing image as idempotent success or as `404` based on desired UX.
- Recommendation: return success with `removed: false` for missing label when the image exists. The resulting state is already "not in gallery," which is what the admin asked for.
- Return `404` only when the image itself does not exist.
- Validate `label` against `IMAGE_LABELS` values to avoid creating a broad arbitrary label mutation API.
- Do not touch `image_file`.
- Do not touch `plant_images`.
- Do not call `deleteImage`.

### 3. Add The Server Route

File:

- `packages/server/src/rest/images.ts`

Add route before `/:hash` style routes if route ordering matters in Express.

Suggested route:

```ts
router.delete("/:hash/labels/:label", async (req, res) => {
    // admin only
    // validate hash and label
    // call removeImageLabelRelation
    // audit admin action
    // return success payload
});
```

Expected responses:

Success:

```json
{
  "success": true,
  "hash": "abc123",
  "removedLabel": "gallery",
  "remainingLabels": [],
  "remainingPlantUsage": 0,
  "unlabeled": true,
  "message": "Removed image from gallery"
}
```

Image missing:

```json
{
  "error": "Image not found"
}
```

Invalid label:

```json
{
  "error": "Invalid image label"
}
```

Non-admin:

- Match existing auth behavior for image mutation routes.

CSRF:

- The route is a destructive admin mutation, so it should be covered by the existing CSRF middleware just like `DELETE /images/:hash`.

Audit:

- Add an audit event with hash, label, whether a label row was removed, and whether the image is now unlabeled.
- Reuse `AuditEventType.ADMIN_IMAGE_UPDATE` if adding a new audit enum is not worthwhile.

### 4. Preserve Global Delete Semantics

Keep `DELETE /api/rest/v1/images/:hash` as permanent asset deletion.

Recommended small cleanup:

- Align the comment inside `performImageDeletion` with actual route behavior. It currently says non-forced in-use deletion warns but allows deletion. The route blocks before calling it, so the comment is misleading unless other callers call `deleteImage(hash, false)` directly.
- Do not remove the usage guard.
- Do not make global delete auto-remove all relations. That would unexpectedly remove images from plants, hero banners, or seasonal content.

## Frontend Implementation Plan

### 1. Add REST Client And Hook

Files:

- `packages/ui/src/api/rest/client.ts`
- `packages/ui/src/api/rest/hooks.ts`

Add client method:

```ts
async removeImageLabel(hash: string, label: ImageLabel): Promise<RemoveImageLabelResponse>
```

Add hook:

```ts
export function useRemoveImageLabel() {
    return useRestMutation<{ hash: string; label: ImageLabel }, RemoveImageLabelResponse>(
        (input) => restApi.removeImageLabel(input.hash, input.label),
    );
}
```

Reuse shared response types if the codebase has a preferred pattern for contract-derived types.

### 2. Update Admin Gallery Page

File:

- `packages/ui/src/pages/admin/AdminGalleryPage/AdminGalleryPage.tsx`

Change the Gallery trash action from permanent deletion to gallery removal:

- Replace `useDeleteImage` with `useRemoveImageLabel`.
- On confirm, call `{ hash, label: IMAGE_LABELS.Gallery }`.
- Refetch images after success.
- Update confirmation text.

Recommended copy:

- Dialog title: `Remove From Gallery?`
- Body: `This removes "{alt}" from the public gallery. The image asset will remain available anywhere else it is used.`
- If the endpoint returns `unlabeled: true`, optional success message: `Removed from gallery. The image is no longer used and will be eligible for cleanup after the retention period.`
- Button: `Remove`

Avoid saying "permanently deleted from the server" in this flow.

### 3. Keep Storage/Admin Asset Deletion Separate

Do not route storage cleanup or asset-management delete actions to `removeImageLabel`.

Any future UI for permanent asset deletion should:

- show usage details from `GET /images/:hash/usage`;
- require explicit confirmation;
- call `DELETE /images/:hash` without force for safe delete;
- offer `force=true` only behind a clear destructive confirmation.

## Test Plan

### Server Integration Tests

File:

- `packages/server/src/rest/accountGalleryContracts.integration.test.ts`

Add tests:

1. Removing a gallery image label succeeds.
   - Create image with `gallery` label.
   - Call `DELETE /images/:hash/labels/gallery` with admin session and CSRF.
   - Assert response success.
   - Assert `image` still exists.
   - Assert `image_file` still exists.
   - Assert `gallery` label is gone.
   - Assert `unlabeled_since` is set if no other labels or plant relations exist.
   - Assert `GET /images?label=gallery` no longer includes the image.

2. Removing gallery label preserves other label usage.
   - Create image with `gallery` and `hero-banner` labels.
   - Remove `gallery`.
   - Assert `hero-banner` remains.
   - Assert `unlabeled_since` is null.
   - Assert asset files remain.

3. Removing gallery label preserves plant usage.
   - Create image with `gallery` label and a `plant_images` relation.
   - Remove `gallery`.
   - Assert plant relation remains.
   - Assert `unlabeled_since` is null.

4. Gallery labels are reindexed.
   - Create three gallery images with indexes 0, 1, 2.
   - Remove the middle image's gallery label.
   - Assert remaining gallery indexes are 0 and 1.
   - Assert `GET /images?label=gallery` returns remaining images in expected order.

5. Missing gallery label is idempotent.
   - Create image without `gallery`.
   - Call remove endpoint.
   - Assert success with `removed: false`, or assert chosen error behavior if the team rejects idempotency.

6. Missing image returns 404.

7. Invalid label returns 400.

8. CSRF is required.
   - Match the existing `PUT /images` and `DELETE /images/:hash` tests.

Update the existing test named `blocks in-use image deletion without force and deletes it with force` only if needed for wording. Keep it, because it documents the permanent delete safety guard.

### Server Unit Tests

Files:

- Add a utility test if a new utility file is introduced.
- Existing `packages/server/src/rest/images.test.ts` can cover pure reindex helpers if extracted.

Cover:

- label validation helper;
- reindex helper, if pure;
- unlabeled decision helper, if pure.

### UI Tests

File:

- `packages/ui/src/pages/admin/AdminGalleryPage/AdminGalleryPage.test.tsx`

Update mocks:

- Replace `useDeleteImage` mock with `useRemoveImageLabel`.

Update test:

- "confirms gallery image deletion" should become "confirms gallery image removal".
- Assert hook is called with `{ hash: "gallery-image-1", label: IMAGE_LABELS.Gallery }`.
- Assert refetch happens on success.

Add test:

- Dialog copy says "Remove From Gallery" and does not say "permanently deleted from the server."

### Contract Tests

File:

- `packages/shared/src/api/contracts.test.ts`

Add expectations for:

- default route path: `/api/rest/v1/images/:hash/labels/:label`
- concrete route path: `/api/rest/v1/images/abc123/labels/gallery`

### Manual QA

Use a local database/runtime only. Do not run production deploy or production cleanup.

Scenarios:

1. Upload a new gallery image in Admin Gallery.
2. Remove it from gallery.
3. Confirm it disappears from Admin Gallery and public Gallery.
4. Confirm storage/recent activity shows it as recently unlabeled.
5. Confirm files still exist before retention cleanup.
6. Add an image used by another label, remove it from gallery, confirm other usage remains.
7. Confirm permanent delete still blocks without `force=true` while an image has any label.

## Validation Commands

Fast targeted validation:

```bash
yarn workspace @local/shared test -- contracts.test.ts
yarn workspace server test:integration -- accountGalleryContracts.integration.test.ts
yarn workspace ui test -- AdminGalleryPage.test.tsx
```

If the package scripts do not pass file filters through as expected, use the underlying Vitest commands from each package.

Broader validation:

```bash
yarn typecheck
yarn typecheck:test
yarn lint
yarn test:unit
yarn workspace server test:integration
```

Full repository validation:

```bash
yarn validate:full
```

Only run browser or production-local validation after confirming the local runtime is appropriate. Do not run production deployment, production backup, cleanup, update, prune, restart, or deletion commands unless explicitly requested.

## Rollout Plan

1. Implement shared route and contract.
2. Implement backend utility and route.
3. Add server integration coverage.
4. Add UI client/hook.
5. Switch Admin Gallery page to remove the gallery label.
6. Update UI tests and copy.
7. Run targeted tests.
8. Run broader validation.
9. Deploy through normal deployment policy only after validation.

## Risks And Mitigations

Risk: accidentally deleting image assets from a non-asset-management context.

- Mitigation: Gallery UI calls only the label-removal endpoint; do not call `deleteImage`.

Risk: orphaning gallery indexes after removal.

- Mitigation: reindex remaining label rows in the same transaction.

Risk: cleanup deletes an image still used elsewhere.

- Mitigation: set `unlabeled_since` only when both remaining label count and plant relation count are zero. Existing cleanup also checks both conditions before deletion.

Risk: allowing arbitrary label mutation through the new endpoint.

- Mitigation: validate labels against `IMAGE_LABELS` values.

Risk: confusing admin copy.

- Mitigation: dialog and snackbar must say "remove from gallery," not "delete from server," for the Gallery flow.

Risk: permanent deletion behavior regresses.

- Mitigation: keep existing integration test that blocks in-use image deletion without `force=true`.

## Open Questions

1. Should removing a missing label be idempotent success or a 404/409?
   - Recommendation: idempotent success if the image exists.

2. Should a Gallery removal immediately delete the asset when it becomes unused?
   - Recommendation: no. Mark `unlabeled_since` and let retention cleanup handle physical deletion.

3. Should `PUT /images` eventually support replacing the full membership of a label?
   - Recommendation: not for this fix. It could be useful later for bulk reorder/remove, but a dedicated remove endpoint is clearer and lower risk.

4. Should `removeImageLabel` be exported from `imageLabelSync.ts`?
   - Recommendation: extract shared label mutation helpers to a neutral module. `imageLabelSync.ts` is currently framed around JSON-driven landing page sync, not admin mutations.
