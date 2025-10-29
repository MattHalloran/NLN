# Image Management Flow Diagrams

## 1. Image Upload Flow

```
User (Admin) 
    |
    v
POST /api/rest/v1/images (multipart/form-data)
    |
    ├─ files: File[]
    ├─ label: "gallery" | "hero" | etc.
    └─ alts, descriptions
    |
    v
saveImage() in fileIO.ts
    |
    ├─ Validation
    |   ├─ MIME type check
    |   ├─ Extension check
    |   └─ HEIC -> JPEG conversion
    |
    ├─ Processing
    |   ├─ Generate image hash
    |   ├─ Get dimensions
    |   └─ Check for duplicates
    |
    └─ Storage
        |
        ├─ Create image record (DB)
        |   └─ hash, alt, description
        |
        ├─ Create image_file records (DB) × ~10 variants
        |   └─ XXL, XL, LG, MD, SM (+ WebP versions)
        |
        ├─ Create image_labels record (DB) if label provided
        |   └─ label, index (for sorting)
        |
        └─ Save files to disk
            └─ /assets/images/filename-{SIZE}.{ext|webp}
    |
    v
Response: { success, src, hash, width, height }
```

## 2. Gallery Image Retrieval Flow

```
GET /api/rest/v1/images?label=gallery
    |
    v
Prisma Query
    |
    ├─ Find all images with label="gallery"
    ├─ Sort by image_labels.index
    └─ Select files (all variants)
    |
    v
Response: Array<ImageData>
    |
    └─ For each image:
        ├─ hash
        ├─ alt
        ├─ description
        └─ files[]
            ├─ src: "images/filename-XXL.jpg"
            ├─ src: "images/filename-XXL.webp"
            ├─ src: "images/filename-XL.jpg"
            └─ ... (all variants)
    |
    v
Frontend (AdminGalleryPage)
    |
    └─ Display WrappedImageList component
        └─ Allow reorder, update alt/description
```

## 3. Hero Banner Image Storage (PROBLEMATIC)

```
Admin: PUT /api/rest/v1/landing-page/
    |
    ├─ Update heroBanners array in request
    |
    v
Landing page content updated
    |
    └─ JSON structure written to disk:
        └─ /packages/server/src/data/landing-page-content.json
            |
            v
            {
              "content": {
                "hero": {
                  "banners": [
                    {
                      "id": "hero-butterfly",
                      "src": "/hero-butterfly-XXL.jpg",  <-- JUST A PATH!
                      "alt": "...",
                      "width": 1901,
                      "height": 1426,
                      "isActive": true
                    }
                  ]
                }
              }
            }
    |
    v
Problems:
├─ No database relationship to image table
├─ No verification if file exists
├─ No cascade delete when removed
└─ Creates orphans when banner removed
```

## 4. Plant Gallery Images (GOOD)

```
Plant Creation
    |
    v
Admin adds images to plant
    |
    v
POST /api/rest/v1/images with label="plant:{plantId}"
OR
plant_images table linked directly
    |
    v
Database structure:
    |
    plant (id=uuid)
        |
        └─ plant_images[]
            |
            ├─ plantId → plant.id
            ├─ hash → image.hash
            ├─ index (sort order)
            └─ isDisplay (flag for primary image)
                |
                └─ image (cascade delete when plant deleted)
                    |
                    └─ image_file[] (cascade delete)
    |
    v
Cascade delete: If plant deleted
    |
    └─ plant_images records deleted
        └─ image records still exist (ORPHAN!)
            └─ image_file records cascade delete
```

## 5. Image Deletion Flow (MISSING!)

```
PROBLEM: No DELETE endpoint exists!

Current options:
    |
    ├─ Option 1: Call deleteImage() directly (not exposed as API)
    |   |
    |   v
    |   deleteImage(hash)
    |       |
    |       ├─ Find all image_file records
    |       ├─ Delete image record from DB
    |       |   └─ image_file cascade deletes
    |       |   └─ image_labels cascade deletes
    |       |   └─ plant_images cascade deletes
    |       |
    |       └─ Delete physical files from disk
    |           └─ /assets/images/filename-*.jpg|webp
    |
    └─ Option 2: Manual database deletion (dangerous!)
        |
        └─ Risk: Files remain on disk (orphans)

WHAT SHOULD HAPPEN:
    |
    DELETE /api/rest/v1/images/:hash (Admin only)
        |
        v
    Auth check
        |
        v
    deleteImage(hash)
        |
        ├─ Database transaction BEGIN
        |   |
        |   ├─ Find all files
        |   ├─ Delete image record
        |   └─ Wait for confirmation
        |
        ├─ Delete physical files
        |   |
        |   └─ Wait for confirmation
        |
        └─ Transaction COMMIT or ROLLBACK
    |
    v
    Response: { success, deletedCount, freedSpace }
```

## 6. Hero Banner Deletion (ORPHAN CREATION)

```
Admin removes hero banner from landing page
    |
    v
PUT /api/rest/v1/landing-page/
    |
    └─ heroBanners array updated
    |
    v
writeLandingPageContent() updates JSON file
    |
    v
✅ JSON file updated
❌ No database changes
❌ No file deletion
    |
    v
Result: ORPHANED FILES
    |
    ├─ /assets/images/hero-butterfly-XXL.jpg          (orphaned)
    ├─ /assets/images/hero-butterfly-XXL.webp         (orphaned)
    ├─ /assets/images/hero-butterfly-XL.jpg           (orphaned)
    ├─ /assets/images/hero-butterfly-XL.webp          (orphaned)
    └─ ... (8-10 files per hero image)
    |
    v
No way to identify these orphans without:
    └─ Manually comparing JSON content with filesystem
    └─ Custom cleanup tools
```

## 7. Database Relationship Map

```
                        image
                    (hash PK)
                    /    |    \
                   /     |     \
              image_file |    image_labels
           (src unique)   |    (hash, label unique)
                          |
                       plant_images
                      (plantId, hash)
                       /        \
                      /          \
                    plant        image
                  (id PK)     (hash FK)
                  
                  
Database Cascade Rules:
    
    image deleted
        ├─ image_file deleted (onDelete: Cascade) ✅
        ├─ image_labels deleted (onDelete: Cascade) ✅
        └─ plant_images deleted (onDelete: Cascade) ✅
    
    plant deleted
        └─ plant_images deleted (onDelete: Cascade) ✅
            └─ image NOT deleted ❌ (ORPHAN!)
            
    image_labels not managed
        └─ No cascade rules defined ❌
```

## 8. Storage Location Map

```
/root/NLN/
├── assets/
│   ├── images/
│   │   ├── butterfly-XXL.jpg
│   │   ├── butterfly-XXL.webp
│   │   ├── butterfly-XL.jpg
│   │   ├── butterfly-XL.webp
│   │   ├── chicks-XXL.jpg
│   │   ├── chicks-XXL.webp
│   │   └── ... (245 files, ~80MB)
│   ├── private/
│   │   └── (non-public assets)
│   └── public/
│       └─ privacy.md, terms.md
│
├── packages/
│   └── server/
│       ├── src/
│       │   ├── rest/
│       │   │   ├── images.ts           (GET, POST, PUT)
│       │   │   └── landingPage.ts      (PUT with hero/seasonal)
│       │   ├── utils/
│       │   │   └── fileIO.ts           (saveImage, deleteImage)
│       │   └── data/
│       │       └── landing-page-content.json  (hero image refs)
│       └── tools/
│           └── cleanImageData.ts       (cleanup tool)
│
└── scripts/
    ├── cleanup-unlabeled-images.sh    (remove unlabeled)
    ├── find-orphaned-files.sh         (detect orphans)
    └── delete-orphaned-files.sh       (manual cleanup)
```

## 9. Orphan Detection Scenarios

```
ORPHAN TYPE 1: Files on disk but not in database
    
    /assets/images/butterfly-XXL.jpg exists
    BUT
    image_file.src != "images/butterfly-XXL.jpg"
    
    Cause: Manual file deletion or migration issues
    Impact: Wasted disk space
    Detection: find-orphaned-files.sh

ORPHAN TYPE 2: Database records but no files
    
    image_file.src = "images/butterfly-XXL.jpg" exists
    BUT
    /assets/images/butterfly-XXL.jpg missing
    
    Cause: Manual file deletion or file corruption
    Impact: Broken image references in UI
    Detection: cleanImageData.ts

ORPHAN TYPE 3: Hero images removed but files remain
    
    landing-page-content.json updated (banner removed)
    BUT
    /assets/images/hero-butterfly-XXL.jpg still exists
    AND
    image table may or may not have a record
    
    Cause: No cascade delete for JSON-based refs
    Impact: Disk space bloat, no way to identify
    Detection: Manual JSON parsing + filesystem comparison
    
ORPHAN TYPE 4: Plant deleted but images remain
    
    plant deleted (cascade deletes plant_images)
    BUT
    image records remain
    AND
    physical files remain
    
    Cause: plant_images.image has onDelete: Cascade
         BUT image table has no onDelete rule
    Impact: Orphaned images with no usage
    Detection: Find images not referenced by anything
```

## 10. Recommended Enhanced Flow (Future)

```
DELETE /api/rest/v1/images/:hash (Admin only)
    |
    v
BEGIN TRANSACTION
    |
    ├─ Verify image exists
    ├─ Find all image_file references
    ├─ Find all plant_images references
    ├─ Find all image_labels references
    ├─ Find all landing-page-content.json references
    |
    v
Build impact report:
    |
    ├─ Files to delete: 10
    ├─ Database records to cascade: 15
    ├─ Plants affected: 3
    ├─ Landing page sections affected: 0
    └─ Disk space to free: 1.2MB
    |
    v
Confirm deletion with user
    |
    v
Execute:
    |
    ├─ Delete from image table (cascade to files, labels, plant_images)
    |   └─ Transaction point 1
    |
    ├─ Delete physical files from disk
    |   └─ Transaction point 2
    |
    ├─ Check for JSON references and warn if found
    |
    └─ Update landing-page-content.json if needed
        └─ Remove any hero/seasonal refs
    |
    v
COMMIT TRANSACTION
    |
    v
Return: {
  success: true,
  deleted: {
    dbRecords: 15,
    physicalFiles: 10,
    freedSpace: "1.2MB"
  },
  warnings: [
    "No landing page references found - OK"
  ]
}
```

---

## Key Takeaways

1. **Three Storage Systems:**
   - Database (image, image_file, image_labels, plant_images)
   - Filesystem (/assets/images/)
   - JSON config (landing-page-content.json)

2. **Critical Gap:**
   - Hero and seasonal images only in JSON
   - Not linked to database
   - No cascade delete when removed
   - Creates unidentifiable orphans

3. **Missing Deletion:**
   - No API endpoint to delete images
   - deleteImage() function exists but not exposed
   - No admin UI to remove images
   - Disk space grows unbounded

4. **Safety Issues:**
   - No transaction support
   - Partial failures leave orphans
   - WebP variants not always cleaned together
   - No rollback mechanism

5. **Cleanup Tools:**
   - Limited in scope
   - Don't handle JSON references
   - Can't distinguish intentional vs orphan
   - Require manual intervention
