import { IMAGE_LABELS, type ImageLabel } from "@local/shared";
import type { PrismaClient } from "@prisma/client";

export type ImageLabelRemovalResult = {
    exists: boolean;
    removed: boolean;
    remainingLabels: string[];
    remainingPlantUsage: number;
    unlabeled: boolean;
};

export const isKnownImageLabel = (label: string): label is ImageLabel =>
    (Object.values(IMAGE_LABELS) as string[]).includes(label);

export async function removeImageLabelRelation(
    prisma: PrismaClient,
    input: { hash: string; label: ImageLabel }
): Promise<ImageLabelRemovalResult> {
    const { hash, label } = input;

    return prisma.$transaction(async (tx) => {
        const image = await tx.image.findUnique({
            where: { hash },
            select: { hash: true },
        });

        if (!image) {
            return {
                exists: false,
                removed: false,
                remainingLabels: [],
                remainingPlantUsage: 0,
                unlabeled: false,
            };
        }

        const deleted = await tx.image_labels.deleteMany({
            where: { hash, label },
        });

        const remainingForLabel = await tx.image_labels.findMany({
            where: { label },
            orderBy: [{ index: "asc" }, { id: "asc" }],
            select: { id: true },
        });

        await Promise.all(
            remainingForLabel.map((row, index) =>
                tx.image_labels.update({
                    where: { id: row.id },
                    data: { index },
                })
            )
        );

        const [remainingLabels, remainingPlantUsage] = await Promise.all([
            tx.image_labels.findMany({
                where: { hash },
                orderBy: [{ label: "asc" }],
                select: { label: true },
            }),
            tx.plant_images.count({ where: { hash } }),
        ]);

        const unlabeled = remainingLabels.length === 0 && remainingPlantUsage === 0;

        await tx.image.update({
            where: { hash },
            data: { unlabeled_since: unlabeled ? new Date() : null },
        });

        return {
            exists: true,
            removed: deleted.count > 0,
            remainingLabels: remainingLabels.map((row) => row.label),
            remainingPlantUsage,
            unlabeled,
        };
    });
}
