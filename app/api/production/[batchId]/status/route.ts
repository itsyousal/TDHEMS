import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const session = await getAuthSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { batchId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["start", "complete", "delay"].includes(action)) {
      return new NextResponse("Invalid action", { status: 400 });
    }

    // Find the batch by batchNumber
    const batch = await prisma.productionBatch.findFirst({
      where: { batchNumber: batchId },
      include: {
        ingredients: {
          include: {
            sku: true,
          },
        },
        bom: {
          include: {
            sku: true,
          },
        },
      },
    });

    if (!batch) {
      return new NextResponse("Batch not found", { status: 404 });
    }

    let newStatus: string;
    const updateData: {
      status: string;
      startedAt?: Date;
      completedAt?: Date;
    } = { status: "" };

    switch (action) {
      case "start":
        newStatus = "in_progress";
        updateData.status = newStatus;
        updateData.startedAt = new Date();
        break;
      case "complete":
        newStatus = "completed";
        updateData.status = newStatus;
        updateData.completedAt = new Date();
        break;
      case "delay":
        newStatus = "delayed";
        updateData.status = newStatus;
        break;
      default:
        return new NextResponse("Invalid action", { status: 400 });
    }

    // Update the batch status
    const updatedBatch = await prisma.productionBatch.update({
      where: { id: batch.id },
      data: updateData,
    });

    // If batch is completed, update inventory with the finished goods
    if (action === "complete") {
      // Determine the SKU for the finished product
      // Priority: BOM's SKU > first ingredient's SKU
      let finishedSkuId: string | null = null;
      
      if (batch.bom?.skuId) {
        finishedSkuId = batch.bom.skuId;
      } else if (batch.ingredients.length > 0) {
        // Use the first ingredient's SKU as a fallback (not ideal, but works for demo)
        finishedSkuId = batch.ingredients[0].skuId;
      }

      if (finishedSkuId) {
        const yieldQuantity = batch.yieldQuantity || batch.yieldActual || 100;

        // Get the first location for this org to add inventory
        const location = await prisma.location.findFirst({
          where: { orgId: batch.orgId, isActive: true },
        });

        if (location) {
          // Upsert inventory record
          await prisma.inventory.upsert({
            where: {
              locationId_skuId: {
                locationId: location.id,
                skuId: finishedSkuId,
              },
            },
            update: {
              quantity: { increment: yieldQuantity },
              availableQuantity: { increment: yieldQuantity },
            },
            create: {
              orgId: batch.orgId,
              locationId: location.id,
              skuId: finishedSkuId,
              quantity: yieldQuantity,
              availableQuantity: yieldQuantity,
              reservedQuantity: 0,
            },
          });

          // Optionally, deduct raw materials used in production
          for (const ingredient of batch.ingredients) {
            const usedQty = ingredient.usedQuantity || ingredient.requiredQuantity;
            
            // Find inventory for this raw material
            const rawInventory = await prisma.inventory.findFirst({
              where: {
                skuId: ingredient.skuId,
                locationId: location.id,
              },
            });

            if (rawInventory && rawInventory.quantity >= usedQty) {
              await prisma.inventory.update({
                where: { id: rawInventory.id },
                data: {
                  quantity: { decrement: usedQty },
                  availableQuantity: { decrement: usedQty },
                },
              });
            }
          }

          // Create an inventory lot for traceability
          await prisma.inventoryLot.create({
            data: {
              skuId: finishedSkuId,
              batchId: batch.id,
              lotNumber: batch.batchNumber,
              quantity: yieldQuantity,
              manufactureDate: new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      batch: {
        id: updatedBatch.batchNumber,
        status: updatedBatch.status,
      },
    });
  } catch (error) {
    console.error("[PRODUCTION_BATCH_STATUS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
