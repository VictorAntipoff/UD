import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireWarehouseManagement, requireStockAdjustment, requireRole } from '../middleware/auth.js';
async function managementRoutes(fastify) {
    // SECURITY: Protect all management routes with authentication
    fastify.addHook('onRequest', authenticateToken);
    // Generate next LOT number
    fastify.get('/wood-receipts/next-lot', async (request, reply) => {
        try {
            // Get the latest LOT number
            const latestReceipt = await prisma.woodReceipt.findFirst({
                orderBy: { lotNumber: 'desc' },
                select: { lotNumber: true }
            });
            let nextNumber = 1;
            const currentYear = new Date().getFullYear();
            if (latestReceipt && latestReceipt.lotNumber) {
                // Extract number from LOT-YYYY-XXX format
                const match = latestReceipt.lotNumber.match(/LOT-(\d{4})-(\d+)/);
                if (match) {
                    const year = parseInt(match[1]);
                    const number = parseInt(match[2]);
                    // If same year, increment; if new year, reset to 1
                    if (year === currentYear) {
                        nextNumber = number + 1;
                    }
                }
            }
            const nextLotNumber = `LOT-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
            return { lotNumber: nextLotNumber };
        }
        catch (error) {
            console.error('Error generating next LOT number:', error);
            return reply.status(500).send({ error: 'Failed to generate next LOT number' });
        }
    });
    // Get all wood receipts
    fastify.get('/wood-receipts', async (request, reply) => {
        try {
            const receipts = await prisma.woodReceipt.findMany({
                include: {
                    woodType: true,
                    warehouse: true,
                    measurements: true // Include sleeper/plank measurements
                },
                orderBy: { createdAt: 'desc' }
            });
            return receipts;
        }
        catch (error) {
            console.error('Error fetching wood receipts:', error);
            return reply.status(500).send({ error: 'Failed to fetch wood receipts' });
        }
    });
    // Create a new wood receipt
    fastify.post('/wood-receipts', async (request, reply) => {
        try {
            const data = request.body;
            if (!data.wood_type_id || !data.supplier || !data.receipt_date) {
                return reply.status(400).send({ error: 'Missing required fields: wood_type_id, supplier, and receipt_date are required' });
            }
            // Auto-generate LOT number if not provided
            let lotNumber = data.lot_number;
            if (!lotNumber) {
                const latestReceipt = await prisma.woodReceipt.findFirst({
                    orderBy: { lotNumber: 'desc' },
                    select: { lotNumber: true }
                });
                let nextNumber = 1;
                const currentYear = new Date().getFullYear();
                if (latestReceipt && latestReceipt.lotNumber) {
                    const match = latestReceipt.lotNumber.match(/LOT-(\d{4})-(\d+)/);
                    if (match) {
                        const year = parseInt(match[1]);
                        const number = parseInt(match[2]);
                        if (year === currentYear) {
                            nextNumber = number + 1;
                        }
                    }
                }
                lotNumber = `LOT-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
            }
            const receipt = await prisma.woodReceipt.create({
                data: {
                    woodTypeId: data.wood_type_id,
                    warehouseId: data.warehouse_id || null,
                    supplier: data.supplier,
                    receiptDate: new Date(data.receipt_date),
                    lotNumber: lotNumber,
                    purchaseOrder: data.purchase_order || null,
                    woodFormat: data.wood_format || 'SLEEPERS',
                    notes: data.notes || null,
                    estimatedAmount: data.total_amount || 0,
                    estimatedVolumeM3: data.total_volume_m3 || null,
                    estimatedPieces: data.total_pieces || null
                },
                include: {
                    woodType: true,
                    warehouse: true
                }
            });
            return receipt;
        }
        catch (error) {
            console.error('Error creating wood receipt:', error);
            return reply.status(500).send({ error: 'Failed to create wood receipt' });
        }
    });
    // Update a wood receipt
    fastify.put('/wood-receipts/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            console.log('PUT /wood-receipts/:id - Received data:', JSON.stringify(data, null, 2));
            const receipt = await prisma.woodReceipt.update({
                where: { id },
                data: {
                    woodTypeId: data.wood_type_id,
                    warehouseId: data.warehouse_id,
                    supplier: data.supplier,
                    receiptDate: data.receipt_date ? new Date(data.receipt_date) : undefined,
                    // LOT number is immutable - don't allow updates
                    purchaseOrder: data.purchase_order,
                    woodFormat: data.wood_format,
                    status: data.status,
                    notes: data.notes,
                    estimatedAmount: data.total_amount,
                    estimatedVolumeM3: data.total_volume_m3,
                    estimatedPieces: data.total_pieces
                },
                include: {
                    woodType: true,
                    warehouse: true
                }
            });
            console.log('PUT /wood-receipts/:id - Update successful');
            return receipt;
        }
        catch (error) {
            console.error('Error updating wood receipt:', error);
            return reply.status(500).send({ error: 'Failed to update wood receipt' });
        }
    });
    // Partial update a wood receipt (PATCH)
    fastify.patch('/wood-receipts/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const updateData = {};
            if (data.wood_type_id !== undefined)
                updateData.woodTypeId = data.wood_type_id;
            if (data.supplier !== undefined)
                updateData.supplier = data.supplier;
            if (data.receipt_date !== undefined)
                updateData.receiptDate = new Date(data.receipt_date);
            // LOT number is immutable - ignore any attempts to update it
            if (data.purchase_order !== undefined)
                updateData.purchaseOrder = data.purchase_order;
            if (data.wood_format !== undefined)
                updateData.woodFormat = data.wood_format;
            if (data.status !== undefined)
                updateData.status = data.status;
            if (data.notes !== undefined)
                updateData.notes = data.notes;
            if (data.total_amount !== undefined)
                updateData.estimatedAmount = data.total_amount;
            if (data.total_volume_m3 !== undefined)
                updateData.estimatedVolumeM3 = data.total_volume_m3;
            if (data.total_pieces !== undefined)
                updateData.estimatedPieces = data.total_pieces;
            if (data.actual_volume_m3 !== undefined)
                updateData.actualVolumeM3 = data.actual_volume_m3;
            if (data.actual_pieces !== undefined)
                updateData.actualPieces = data.actual_pieces;
            const receipt = await prisma.woodReceipt.update({
                where: { id },
                data: updateData,
                include: {
                    woodType: true
                }
            });
            // If status changed to PENDING_APPROVAL, create notifications for admins
            if (data.status === 'PENDING_APPROVAL') {
                // Check for subscriptions to LOT_PENDING_APPROVAL event
                const subscriptions = await prisma.notificationSubscription.findMany({
                    where: {
                        eventType: 'LOT_PENDING_APPROVAL',
                        inApp: true
                    }
                });
                // If no subscriptions exist, fallback to all admin users
                let userIds;
                if (subscriptions.length === 0) {
                    const adminUsers = await prisma.user.findMany({
                        where: {
                            role: { in: ['ADMIN', 'SUPERVISOR'] },
                            isActive: true
                        },
                        select: { id: true }
                    });
                    userIds = adminUsers.map(u => u.id);
                }
                else {
                    userIds = subscriptions.map(s => s.userId);
                }
                const notifications = userIds.map(userId => ({
                    userId,
                    type: 'LOT_PENDING_APPROVAL',
                    title: 'LOT Pending Approval',
                    message: `LOT ${receipt.lotNumber} (${receipt.woodType.name}) is pending approval. ${data.actual_pieces || receipt.actualPieces || 0} pieces (${(data.actual_volume_m3 || receipt.actualVolumeM3 || 0).toFixed(2)} m³)`,
                    linkUrl: `/dashboard/management/wood-receipt`,
                    isRead: false
                }));
                if (notifications.length > 0) {
                    await prisma.notification.createMany({
                        data: notifications
                    });
                    console.log(`Created ${notifications.length} notification(s) for LOT ${receipt.lotNumber} pending approval`);
                }
            }
            return receipt;
        }
        catch (error) {
            console.error('Error updating wood receipt:', error);
            return reply.status(500).send({ error: 'Failed to update wood receipt' });
        }
    });
    // Delete a wood receipt
    fastify.delete('/wood-receipts/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.woodReceipt.delete({
                where: { id }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting wood receipt:', error);
            return reply.status(500).send({ error: 'Failed to delete wood receipt' });
        }
    });
    // Get LOT traceability - all records related to a LOT number
    fastify.get('/lot-traceability/:lotNumber', async (request, reply) => {
        try {
            const { lotNumber } = request.params;
            if (!lotNumber) {
                return reply.status(400).send({ error: 'LOT number is required' });
            }
            // Get wood receipts for this LOT
            const woodReceipts = await prisma.woodReceipt.findMany({
                where: { lotNumber },
                include: {
                    woodType: true,
                    measurements: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            // Get draft data for this LOT
            const drafts = await prisma.receiptDraft.findMany({
                where: { receiptId: lotNumber },
                orderBy: { updatedAt: 'desc' }
            });
            // Get slicing operations for this LOT
            const slicingOperations = await prisma.operation.findMany({
                where: { lotNumber },
                include: {
                    woodType: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            // Get receipt processing history for this LOT
            const receiptHistory = await prisma.receiptHistory.findMany({
                where: { receiptId: lotNumber },
                orderBy: {
                    timestamp: 'asc'
                }
            });
            // Get LOT cost information
            const lotCost = await prisma.lotCost.findUnique({
                where: { lotNumber }
            });
            // Enrich wood receipts with draft data
            const enrichedWoodReceipts = await Promise.all(woodReceipts.map(async (receipt) => {
                let actualVolumeM3 = receipt.actualVolumeM3;
                let actualPieces = receipt.actualPieces;
                let lastWorkedBy = null;
                let lastWorkedAt = null;
                // If there's draft data, calculate from measurements
                const draft = drafts.find(d => d.receiptId === lotNumber);
                if (draft && draft.measurements) {
                    const measurements = draft.measurements;
                    // Calculate total pieces by summing all qty fields
                    actualPieces = measurements.reduce((sum, m) => {
                        return sum + (parseInt(m.qty) || 1);
                    }, 0);
                    // Calculate total volume
                    actualVolumeM3 = measurements.reduce((sum, m) => {
                        const thickness = parseFloat(m.thickness) || 0;
                        const width = parseFloat(m.width) || 0;
                        const length = parseFloat(m.length) || 0;
                        const qty = parseInt(m.qty) || 1;
                        // Detect unit system: if thickness and width are small (< 50), assume imperial (inches/feet)
                        // Otherwise assume metric (cm)
                        let volumeM3;
                        if (thickness < 50 && width < 50) {
                            // Imperial: thickness and width in inches, length in feet
                            const thicknessM = thickness * 0.0254; // inch to meter
                            const widthM = width * 0.0254; // inch to meter
                            const lengthM = length * 0.3048; // feet to meter
                            volumeM3 = thicknessM * widthM * lengthM * qty;
                        }
                        else {
                            // Metric: all in cm
                            volumeM3 = (thickness / 100) * (width / 100) * (length / 100) * qty;
                        }
                        return sum + volumeM3;
                    }, 0);
                    // Get the last user who worked on this receipt
                    if (draft.updatedBy) {
                        // Fetch user information
                        const user = await prisma.user.findUnique({
                            where: { id: draft.updatedBy }
                        });
                        // Use full name with role if available, otherwise fall back to email or ID
                        if (user) {
                            if (user.firstName || user.lastName) {
                                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                                lastWorkedBy = `${fullName} (${user.role})`;
                            }
                            else {
                                lastWorkedBy = `${user.email} (${user.role})`;
                            }
                        }
                        else {
                            lastWorkedBy = draft.updatedBy;
                        }
                        lastWorkedAt = draft.updatedAt;
                    }
                }
                return {
                    id: receipt.id,
                    woodType: receipt.woodType.name,
                    supplier: receipt.supplier,
                    receiptDate: receipt.receiptDate,
                    purchaseOrder: receipt.purchaseOrder,
                    status: receipt.status,
                    woodFormat: receipt.woodFormat,
                    // Keep original estimates separate (in RED on frontend)
                    estimatedVolumeM3: receipt.estimatedVolumeM3,
                    estimatedPieces: receipt.estimatedPieces,
                    // Show actual measured values (in GREEN on frontend)
                    actualVolumeM3: actualVolumeM3,
                    actualPieces: actualPieces,
                    estimatedAmount: receipt.estimatedAmount,
                    receiptConfirmedAt: receipt.receiptConfirmedAt,
                    notes: receipt.notes,
                    createdAt: receipt.createdAt,
                    updatedAt: receipt.updatedAt,
                    // Last user who worked on this receipt
                    lastWorkedBy: lastWorkedBy,
                    lastWorkedAt: lastWorkedAt,
                    // Include the measurements for PDF generation
                    measurements: draft?.measurements || null
                };
            }));
            // TODO: Add other stages here when they're implemented
            // - Drying records
            // - Quality control records
            // - Inventory records
            return {
                lotNumber,
                stages: {
                    woodReceipts: enrichedWoodReceipts,
                    slicing: slicingOperations.map(op => ({
                        id: op.id,
                        serialNumber: op.serialNumber,
                        woodType: op.woodType.name,
                        status: op.status,
                        startTime: op.startTime,
                        endTime: op.endTime,
                        wastePercentage: op.wastePercentage,
                        sleeperSizes: op.sleeperSizes,
                        plankSizes: op.plankSizes,
                        notes: op.notes,
                        createdAt: op.createdAt,
                        updatedAt: op.updatedAt
                    })),
                    // Future stages will be added here
                    drying: [],
                    qualityControl: [],
                    inventory: []
                },
                history: receiptHistory.map(h => ({
                    id: h.id,
                    userId: h.userId,
                    userName: h.userName,
                    action: h.action,
                    details: h.details,
                    timestamp: h.timestamp
                })),
                cost: lotCost ? {
                    purchasePrice: lotCost.purchasePrice,
                    purchasePriceType: lotCost.purchasePriceType,
                    purchasePriceIncVat: lotCost.purchasePriceIncVat,
                    transportPrice: lotCost.transportPrice,
                    transportPriceType: lotCost.transportPriceType,
                    transportPriceIncVat: lotCost.transportPriceIncVat,
                    slicingExpenses: lotCost.slicingExpenses,
                    slicingExpensesType: lotCost.slicingExpensesType,
                    slicingExpensesIncVat: lotCost.slicingExpensesIncVat,
                    otherExpenses: lotCost.otherExpenses,
                    otherExpensesType: lotCost.otherExpensesType,
                    otherExpensesIncVat: lotCost.otherExpensesIncVat,
                    notes: lotCost.notes
                } : null
            };
        }
        catch (error) {
            console.error('Error fetching LOT traceability:', error);
            return reply.status(500).send({ error: 'Failed to fetch LOT traceability' });
        }
    });
    // Get LOT cost information
    fastify.get('/lot-cost/:lotNumber', async (request, reply) => {
        try {
            const { lotNumber } = request.params;
            const lotCost = await prisma.lotCost.findUnique({
                where: { lotNumber }
            });
            return lotCost || {
                lotNumber,
                purchasePrice: null,
                purchasePriceType: 'LUMPSUM',
                transportPrice: null,
                transportPriceType: 'LUMPSUM',
                slicingExpenses: null,
                slicingExpensesType: 'LUMPSUM',
                otherExpenses: null,
                otherExpensesType: 'LUMPSUM',
                notes: null
            };
        }
        catch (error) {
            console.error('Error fetching LOT cost:', error);
            return reply.status(500).send({ error: 'Failed to fetch LOT cost' });
        }
    });
    // Update LOT cost information
    fastify.put('/lot-cost/:lotNumber', async (request, reply) => {
        try {
            const { lotNumber } = request.params;
            const data = request.body;
            const lotCost = await prisma.lotCost.upsert({
                where: { lotNumber },
                update: data,
                create: {
                    lotNumber,
                    ...data
                }
            });
            return lotCost;
        }
        catch (error) {
            console.error('Error updating LOT cost:', error);
            return reply.status(500).send({ error: 'Failed to update LOT cost' });
        }
    });
    // Get all approvals (LOT and factory operations)
    fastify.get('/approvals', async (request, reply) => {
        try {
            // Get wood receipts pending approval (LOT approvals)
            const lotApprovals = await prisma.woodReceipt.findMany({
                where: {
                    status: 'PENDING_APPROVAL'
                },
                include: {
                    woodType: true,
                    warehouse: true
                },
                orderBy: { createdAt: 'desc' }
            });
            // Get factory operation approvals
            const operationApprovals = await prisma.approval.findMany({
                where: {
                    status: 'pending'
                },
                include: {
                    operation: {
                        include: {
                            woodType: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            // Transform LOT approvals to match the approval structure
            const transformedLotApprovals = lotApprovals.map(receipt => ({
                id: receipt.id,
                type: 'LOT_APPROVAL',
                module: 'WOOD_RECEIPT',
                referenceId: receipt.id,
                lotNumber: receipt.lotNumber,
                woodType: receipt.woodType,
                supplier: receipt.supplier,
                receiptDate: receipt.receiptDate,
                estimatedAmount: receipt.estimatedAmount,
                estimatedVolumeM3: receipt.estimatedVolumeM3,
                estimatedPieces: receipt.estimatedPieces,
                actualVolumeM3: receipt.actualVolumeM3,
                actualPieces: receipt.actualPieces,
                woodFormat: receipt.woodFormat,
                warehouse: receipt.warehouse,
                status: 'pending',
                createdAt: receipt.createdAt,
                updatedAt: receipt.updatedAt
            }));
            // Transform operation approvals
            const transformedOperationApprovals = operationApprovals.map(approval => ({
                id: approval.id,
                type: 'OPERATION_APPROVAL',
                module: approval.operation.serialNumber.startsWith('WS-') ? 'WOOD_SLICER' : 'WOOD_CALCULATOR',
                referenceId: approval.operationId,
                operation: approval.operation,
                approverRole: approval.approverRole,
                status: approval.status,
                createdAt: approval.createdAt,
                updatedAt: approval.updatedAt
            }));
            return {
                lotApprovals: transformedLotApprovals,
                operationApprovals: transformedOperationApprovals,
                all: [...transformedLotApprovals, ...transformedOperationApprovals]
            };
        }
        catch (error) {
            console.error('Error fetching approvals:', error);
            return reply.status(500).send({ error: 'Failed to fetch approvals' });
        }
    });
    // Get pending approvals count
    fastify.get('/approvals/pending-count', async (request, reply) => {
        try {
            // Count wood receipts with status PENDING_APPROVAL (waiting for admin approval)
            const lotCount = await prisma.woodReceipt.count({
                where: {
                    status: 'PENDING_APPROVAL'
                }
            });
            // Count factory operation approvals
            const operationCount = await prisma.approval.count({
                where: {
                    status: 'pending'
                }
            });
            return { count: lotCount + operationCount, lotCount, operationCount };
        }
        catch (error) {
            console.error('Error fetching pending count:', error);
            return reply.status(500).send({ error: 'Failed to fetch pending count' });
        }
    });
    // Approve a wood receipt (change status to COMPLETED)
    fastify.post('/wood-receipts/:id/approve', { onRequest: requireRole('ADMIN', 'SUPERVISOR') }, async (request, reply) => {
        try {
            const { id } = request.params;
            // Get the receipt first to get lotNumber
            const existingReceipt = await prisma.woodReceipt.findUnique({
                where: { id },
                include: { woodType: true }
            });
            if (!existingReceipt) {
                return reply.status(404).send({ error: 'Receipt not found' });
            }
            // Get draft measurements
            const draft = await prisma.receiptDraft.findFirst({
                where: { receiptId: existingReceipt.lotNumber },
                orderBy: { updatedAt: 'desc' }
            });
            // If draft has measurements, save them to SleeperMeasurement table
            if (draft && draft.measurements) {
                const measurements = draft.measurements;
                // Delete existing measurements for this receipt (if any)
                await prisma.sleeperMeasurement.deleteMany({
                    where: { receiptId: id }
                });
                // Create new measurements
                await prisma.sleeperMeasurement.createMany({
                    data: measurements.map(m => ({
                        receiptId: id,
                        thickness: parseFloat(m.thickness) || 0,
                        width: parseFloat(m.width) || 0,
                        length: parseFloat(m.length) || 0,
                        qty: parseInt(m.qty) || 1,
                        volumeM3: parseFloat(m.m3) || 0,
                        isCustom: m.isCustom === true
                    }))
                });
            }
            const receipt = await prisma.woodReceipt.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    receiptConfirmedAt: new Date()
                },
                include: {
                    woodType: true
                }
            });
            // Create history entry for approval
            const user = request.user;
            if (user && existingReceipt.lotNumber) {
                try {
                    await prisma.receiptHistory.create({
                        data: {
                            receiptId: existingReceipt.lotNumber,
                            userId: user.userId,
                            userName: user.email || user.userId,
                            action: 'APPROVED',
                            details: `Receipt approved by admin and marked as COMPLETED`,
                            timestamp: new Date()
                        }
                    });
                }
                catch (historyError) {
                    console.error('Error creating approval history:', historyError);
                }
            }
            console.log(`Wood Receipt ${receipt.lotNumber} approved by admin and status set to COMPLETED`);
            return receipt;
        }
        catch (error) {
            console.error('Error approving wood receipt:', error);
            return reply.status(500).send({ error: 'Failed to approve wood receipt' });
        }
    });
    // Reject a wood receipt (you can customize the rejected status)
    fastify.post('/wood-receipts/:id/reject', { onRequest: requireRole('ADMIN', 'SUPERVISOR') }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { notes } = request.body;
            // Get current receipt first to preserve existing notes
            const currentReceipt = await prisma.woodReceipt.findUnique({
                where: { id }
            });
            const receipt = await prisma.woodReceipt.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    notes: notes || currentReceipt?.notes
                },
                include: {
                    woodType: true
                }
            });
            console.log(`Wood Receipt ${receipt.lotNumber} rejected`);
            return receipt;
        }
        catch (error) {
            console.error('Error rejecting wood receipt:', error);
            return reply.status(500).send({ error: 'Failed to reject wood receipt' });
        }
    });
    // ==================== APPROVAL RULES ====================
    // Get all approval rules
    fastify.get('/approval-rules', async (request, reply) => {
        try {
            const { module } = request.query;
            const whereClause = {};
            if (module) {
                whereClause.module = module;
            }
            const rules = await prisma.approvalRule.findMany({
                where: whereClause,
                orderBy: [
                    { module: 'asc' },
                    { conditionField: 'asc' }
                ]
            });
            return rules;
        }
        catch (error) {
            console.error('Error fetching approval rules:', error);
            return reply.status(500).send({ error: 'Failed to fetch approval rules' });
        }
    });
    // Create a new approval rule
    fastify.post('/approval-rules', { onRequest: requireRole('ADMIN') }, async (request, reply) => {
        try {
            const data = request.body;
            if (!data.module || !data.conditionField || !data.operator || data.threshold === undefined) {
                return reply.status(400).send({
                    error: 'Missing required fields: module, conditionField, operator, and threshold are required'
                });
            }
            const rule = await prisma.approvalRule.create({
                data: {
                    module: data.module,
                    conditionField: data.conditionField,
                    operator: data.operator,
                    threshold: parseFloat(data.threshold),
                    isActive: data.isActive ?? true
                }
            });
            return rule;
        }
        catch (error) {
            console.error('Error creating approval rule:', error);
            return reply.status(500).send({ error: 'Failed to create approval rule' });
        }
    });
    // Update an approval rule
    fastify.put('/approval-rules/:id', { onRequest: requireRole('ADMIN') }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            const rule = await prisma.approvalRule.update({
                where: { id },
                data: {
                    module: data.module,
                    conditionField: data.conditionField,
                    operator: data.operator,
                    threshold: data.threshold !== undefined ? parseFloat(data.threshold) : undefined,
                    isActive: data.isActive
                }
            });
            return rule;
        }
        catch (error) {
            console.error('Error updating approval rule:', error);
            return reply.status(500).send({ error: 'Failed to update approval rule' });
        }
    });
    // Delete an approval rule
    fastify.delete('/approval-rules/:id', { onRequest: requireRole('ADMIN') }, async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.approvalRule.delete({
                where: { id }
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting approval rule:', error);
            return reply.status(500).send({ error: 'Failed to delete approval rule' });
        }
    });
    // ==================== WAREHOUSE MANAGEMENT ====================
    // Get all warehouses (including archived if query param is set)
    fastify.get('/warehouses', async (request, reply) => {
        try {
            const { includeArchived } = request.query;
            const whereClause = includeArchived === 'true'
                ? {}
                : { status: 'ACTIVE' };
            const warehouses = await prisma.warehouse.findMany({
                where: whereClause,
                include: {
                    assignedUsers: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            stock: true,
                            transfersFrom: true,
                            transfersTo: true
                        }
                    }
                },
                orderBy: [
                    { status: 'asc' },
                    { code: 'asc' }
                ]
            });
            return warehouses;
        }
        catch (error) {
            console.error('Error fetching warehouses:', error);
            return reply.status(500).send({ error: 'Failed to fetch warehouses' });
        }
    });
    // Get a single warehouse by ID
    fastify.get('/warehouses/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const warehouse = await prisma.warehouse.findUnique({
                where: { id },
                include: {
                    assignedUsers: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true
                                }
                            }
                        }
                    },
                    stock: {
                        include: {
                            woodType: true
                        }
                    },
                    _count: {
                        select: {
                            transfersFrom: true,
                            transfersTo: true,
                            stockAdjustments: true
                        }
                    }
                }
            });
            if (!warehouse) {
                return reply.status(404).send({ error: 'Warehouse not found' });
            }
            return warehouse;
        }
        catch (error) {
            console.error('Error fetching warehouse:', error);
            return reply.status(500).send({ error: 'Failed to fetch warehouse' });
        }
    });
    // Create a new warehouse
    fastify.post('/warehouses', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
        try {
            const data = request.body;
            if (!data.code || !data.name) {
                return reply.status(400).send({
                    error: 'Missing required fields: code and name are required'
                });
            }
            // Check if code already exists
            const existing = await prisma.warehouse.findUnique({
                where: { code: data.code }
            });
            if (existing) {
                return reply.status(400).send({
                    error: 'Warehouse code already exists'
                });
            }
            const warehouse = await prisma.warehouse.create({
                data: {
                    code: data.code,
                    name: data.name,
                    address: data.address || null,
                    contactPerson: data.contactPerson || null,
                    stockControlEnabled: data.stockControlEnabled ?? false,
                    requiresApproval: data.requiresApproval ?? false,
                    status: 'ACTIVE'
                },
                include: {
                    assignedUsers: true
                }
            });
            return warehouse;
        }
        catch (error) {
            console.error('Error creating warehouse:', error);
            return reply.status(500).send({ error: 'Failed to create warehouse' });
        }
    });
    // Update a warehouse
    fastify.put('/warehouses/:id', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
        try {
            const { id } = request.params;
            const data = request.body;
            // If updating code, check it doesn't conflict with existing
            if (data.code) {
                const existing = await prisma.warehouse.findUnique({
                    where: { code: data.code }
                });
                if (existing && existing.id !== id) {
                    return reply.status(400).send({
                        error: 'Warehouse code already exists'
                    });
                }
            }
            const warehouse = await prisma.warehouse.update({
                where: { id },
                data: {
                    code: data.code,
                    name: data.name,
                    address: data.address,
                    contactPerson: data.contactPerson,
                    stockControlEnabled: data.stockControlEnabled,
                    requiresApproval: data.requiresApproval
                },
                include: {
                    assignedUsers: true
                }
            });
            return warehouse;
        }
        catch (error) {
            console.error('Error updating warehouse:', error);
            return reply.status(500).send({ error: 'Failed to update warehouse' });
        }
    });
    // Archive a warehouse (soft delete)
    fastify.patch('/warehouses/:id/archive', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
        try {
            const { id } = request.params;
            const warehouse = await prisma.warehouse.update({
                where: { id },
                data: {
                    status: 'ARCHIVED'
                }
            });
            return warehouse;
        }
        catch (error) {
            console.error('Error archiving warehouse:', error);
            return reply.status(500).send({ error: 'Failed to archive warehouse' });
        }
    });
    // Restore an archived warehouse
    fastify.patch('/warehouses/:id/restore', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
        try {
            const { id } = request.params;
            const warehouse = await prisma.warehouse.update({
                where: { id },
                data: {
                    status: 'ACTIVE'
                }
            });
            return warehouse;
        }
        catch (error) {
            console.error('Error restoring warehouse:', error);
            return reply.status(500).send({ error: 'Failed to restore warehouse' });
        }
    });
    // Update assigned users for a warehouse
    fastify.put('/warehouses/:id/assigned-users', { onRequest: requireWarehouseManagement() }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { userIds } = request.body;
            // Delete all existing user assignments
            await prisma.warehouseUser.deleteMany({
                where: { warehouseId: id }
            });
            // Create new user assignments
            if (userIds && userIds.length > 0) {
                await prisma.warehouseUser.createMany({
                    data: userIds.map(userId => ({
                        warehouseId: id,
                        userId
                    }))
                });
            }
            // Fetch and return the updated warehouse with users
            const warehouse = await prisma.warehouse.findUnique({
                where: { id },
                include: {
                    assignedUsers: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true
                                }
                            }
                        }
                    }
                }
            });
            return warehouse;
        }
        catch (error) {
            console.error('Error updating assigned users:', error);
            return reply.status(500).send({ error: 'Failed to update assigned users' });
        }
    });
    // ==================== STOCK MANAGEMENT ====================
    // Get stock for a specific warehouse
    fastify.get('/warehouses/:id/stock', async (request, reply) => {
        try {
            const { id } = request.params;
            const stock = await prisma.stock.findMany({
                where: { warehouseId: id },
                include: {
                    woodType: true,
                    warehouse: {
                        select: {
                            code: true,
                            name: true
                        }
                    }
                },
                orderBy: [
                    { woodType: { name: 'asc' } },
                    { thickness: 'asc' }
                ]
            });
            return stock;
        }
        catch (error) {
            console.error('Error fetching stock:', error);
            return reply.status(500).send({ error: 'Failed to fetch stock' });
        }
    });
    // Get consolidated stock across all active warehouses
    fastify.get('/stock/consolidated', async (request, reply) => {
        try {
            const stock = await prisma.stock.findMany({
                where: {
                    warehouse: {
                        status: 'ACTIVE'
                    }
                },
                include: {
                    woodType: true,
                    warehouse: {
                        select: {
                            code: true,
                            name: true,
                            stockControlEnabled: true
                        }
                    }
                },
                orderBy: [
                    { woodType: { name: 'asc' } },
                    { thickness: 'asc' },
                    { warehouse: { name: 'asc' } }
                ]
            });
            // Group by wood type and thickness for summary
            const summary = stock.reduce((acc, item) => {
                const key = `${item.woodTypeId}_${item.thickness}`;
                if (!acc[key]) {
                    acc[key] = {
                        woodType: item.woodType,
                        thickness: item.thickness,
                        totalNotDried: 0,
                        totalUnderDrying: 0,
                        totalDried: 0,
                        totalDamaged: 0,
                        totalInTransit: 0,
                        warehouses: []
                    };
                }
                acc[key].totalNotDried += item.statusNotDried;
                acc[key].totalUnderDrying += item.statusUnderDrying;
                acc[key].totalDried += item.statusDried;
                acc[key].totalDamaged += item.statusDamaged;
                acc[key].totalInTransit += item.statusInTransitOut + item.statusInTransitIn;
                acc[key].warehouses.push({
                    warehouse: item.warehouse,
                    quantities: {
                        notDried: item.statusNotDried,
                        underDrying: item.statusUnderDrying,
                        dried: item.statusDried,
                        damaged: item.statusDamaged,
                        inTransitOut: item.statusInTransitOut,
                        inTransitIn: item.statusInTransitIn
                    }
                });
                return acc;
            }, {});
            return {
                detailed: stock,
                summary: Object.values(summary)
            };
        }
        catch (error) {
            console.error('Error fetching consolidated stock:', error);
            return reply.status(500).send({ error: 'Failed to fetch consolidated stock' });
        }
    });
    // Get low stock alerts
    fastify.get('/stock/alerts', async (request, reply) => {
        try {
            const lowStockItems = await prisma.stock.findMany({
                where: {
                    warehouse: {
                        status: 'ACTIVE',
                        stockControlEnabled: true
                    },
                    minimumStockLevel: {
                        not: null
                    }
                },
                include: {
                    woodType: true,
                    warehouse: {
                        select: {
                            code: true,
                            name: true
                        }
                    }
                }
            });
            // Filter items where total available stock is below minimum
            const alerts = lowStockItems.filter(item => {
                const totalAvailable = item.statusNotDried + item.statusDried;
                return item.minimumStockLevel && totalAvailable < item.minimumStockLevel;
            }).map(item => ({
                ...item,
                currentStock: item.statusNotDried + item.statusDried,
                shortfall: item.minimumStockLevel - (item.statusNotDried + item.statusDried)
            }));
            return alerts;
        }
        catch (error) {
            console.error('Error fetching stock alerts:', error);
            return reply.status(500).send({ error: 'Failed to fetch stock alerts' });
        }
    });
    // Create or update stock (for initial setup or minimum level updates)
    fastify.post('/stock', { onRequest: requireStockAdjustment() }, async (request, reply) => {
        try {
            const data = request.body;
            if (!data.warehouseId || !data.woodTypeId || !data.thickness) {
                return reply.status(400).send({
                    error: 'Missing required fields: warehouseId, woodTypeId, and thickness are required'
                });
            }
            // Check if stock record exists
            const existing = await prisma.stock.findUnique({
                where: {
                    warehouseId_woodTypeId_thickness: {
                        warehouseId: data.warehouseId,
                        woodTypeId: data.woodTypeId,
                        thickness: data.thickness
                    }
                }
            });
            let stock;
            if (existing) {
                // Update existing record
                stock = await prisma.stock.update({
                    where: { id: existing.id },
                    data: {
                        minimumStockLevel: data.minimumStockLevel
                    },
                    include: {
                        woodType: true,
                        warehouse: true
                    }
                });
            }
            else {
                // Create new record
                stock = await prisma.stock.create({
                    data: {
                        warehouseId: data.warehouseId,
                        woodTypeId: data.woodTypeId,
                        thickness: data.thickness,
                        minimumStockLevel: data.minimumStockLevel || null,
                        statusNotDried: 0,
                        statusUnderDrying: 0,
                        statusDried: 0,
                        statusDamaged: 0,
                        statusInTransitOut: 0,
                        statusInTransitIn: 0
                    },
                    include: {
                        woodType: true,
                        warehouse: true
                    }
                });
            }
            return stock;
        }
        catch (error) {
            console.error('Error creating/updating stock:', error);
            return reply.status(500).send({ error: 'Failed to create/update stock' });
        }
    });
    // Physical stock adjustment
    fastify.post('/stock/adjust', { onRequest: requireStockAdjustment() }, async (request, reply) => {
        try {
            const data = request.body;
            const userId = request.user?.userId;
            if (!data.warehouseId || !data.woodTypeId || !data.thickness || !data.woodStatus || data.quantityAfter === undefined || !data.reason) {
                return reply.status(400).send({
                    error: 'Missing required fields: warehouseId, woodTypeId, thickness, woodStatus, quantityAfter, and reason are required'
                });
            }
            // Get or create stock record
            let stock = await prisma.stock.findUnique({
                where: {
                    warehouseId_woodTypeId_thickness: {
                        warehouseId: data.warehouseId,
                        woodTypeId: data.woodTypeId,
                        thickness: data.thickness
                    }
                }
            });
            if (!stock) {
                stock = await prisma.stock.create({
                    data: {
                        warehouseId: data.warehouseId,
                        woodTypeId: data.woodTypeId,
                        thickness: data.thickness,
                        statusNotDried: 0,
                        statusUnderDrying: 0,
                        statusDried: 0,
                        statusDamaged: 0,
                        statusInTransitOut: 0,
                        statusInTransitIn: 0
                    }
                });
            }
            // Get current quantity for the specified status
            // Map WoodStatus enum to stock field names
            const statusFieldMap = {
                'NOT_DRIED': 'statusNotDried',
                'UNDER_DRYING': 'statusUnderDrying',
                'DRIED': 'statusDried',
                'DAMAGED': 'statusDamaged'
            };
            const statusField = statusFieldMap[data.woodStatus];
            if (!statusField) {
                return reply.status(400).send({ error: `Invalid wood status: ${data.woodStatus}` });
            }
            const quantityBefore = stock[statusField];
            const quantityChange = data.quantityAfter - quantityBefore;
            // Update stock and create adjustment record in a transaction
            const result = await prisma.$transaction([
                prisma.stock.update({
                    where: { id: stock.id },
                    data: {
                        [statusField]: data.quantityAfter
                    }
                }),
                prisma.stockAdjustment.create({
                    data: {
                        warehouseId: data.warehouseId,
                        woodTypeId: data.woodTypeId,
                        thickness: data.thickness,
                        woodStatus: data.woodStatus,
                        quantityBefore,
                        quantityAfter: data.quantityAfter,
                        quantityChange,
                        reason: data.reason,
                        notes: data.notes || null,
                        adjustedById: userId
                    },
                    include: {
                        woodType: true,
                        warehouse: true,
                        adjustedBy: {
                            select: {
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                })
            ]);
            return result[1]; // Return the adjustment record
        }
        catch (error) {
            console.error('Error adjusting stock:', error);
            return reply.status(500).send({ error: 'Failed to adjust stock' });
        }
    });
    // Get stock adjustment history
    fastify.get('/stock/adjustments', async (request, reply) => {
        try {
            const { warehouseId } = request.query;
            const whereClause = warehouseId ? { warehouseId } : {};
            const adjustments = await prisma.stockAdjustment.findMany({
                where: whereClause,
                include: {
                    woodType: true,
                    warehouse: true,
                    adjustedBy: {
                        select: {
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: { adjustedAt: 'desc' },
                take: 100 // Limit to last 100 adjustments
            });
            return adjustments;
        }
        catch (error) {
            console.error('Error fetching adjustments:', error);
            return reply.status(500).send({ error: 'Failed to fetch adjustments' });
        }
    });
    // ===== NOTIFICATION SETTINGS =====
    // Get all active users (for user selection)
    fastify.get('/notification-settings/users', async (request, reply) => {
        try {
            const users = await prisma.user.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true
                },
                orderBy: [
                    { firstName: 'asc' },
                    { lastName: 'asc' },
                    { email: 'asc' }
                ]
            });
            return users;
        }
        catch (error) {
            console.error('Error fetching users:', error);
            return reply.status(500).send({ error: 'Failed to fetch users' });
        }
    });
    // Get all notification event types (grouped by category)
    fastify.get('/notification-settings/event-types', async (request, reply) => {
        try {
            const eventTypes = await prisma.notificationEventType.findMany({
                where: { isActive: true },
                orderBy: [
                    { category: 'asc' },
                    { name: 'asc' }
                ]
            });
            // Group by category
            const grouped = eventTypes.reduce((acc, event) => {
                if (!acc[event.category]) {
                    acc[event.category] = [];
                }
                acc[event.category].push(event);
                return acc;
            }, {});
            return grouped;
        }
        catch (error) {
            console.error('Error fetching event types:', error);
            return reply.status(500).send({ error: 'Failed to fetch event types' });
        }
    });
    // Get notification preferences for a specific user
    fastify.get('/notification-settings/user/:userId', async (request, reply) => {
        try {
            const { userId } = request.params;
            // Get all event types
            const eventTypes = await prisma.notificationEventType.findMany({
                where: { isActive: true }
            });
            // Get user's subscriptions
            const subscriptions = await prisma.notificationSubscription.findMany({
                where: { userId }
            });
            // Map event types with user's preferences
            const preferences = eventTypes.map(event => {
                const subscription = subscriptions.find(s => s.eventType === event.code);
                return {
                    eventType: event.code,
                    eventName: event.name,
                    eventDescription: event.description,
                    category: event.category,
                    inApp: subscription?.inApp ?? false,
                    email: subscription?.email ?? false
                };
            });
            return preferences;
        }
        catch (error) {
            console.error('Error fetching user preferences:', error);
            return reply.status(500).send({ error: 'Failed to fetch user preferences' });
        }
    });
    // Update notification preferences for a user
    fastify.post('/notification-settings/user/:userId', async (request, reply) => {
        try {
            const { userId } = request.params;
            const { preferences } = request.body;
            // Update or create subscriptions for each preference
            for (const pref of preferences) {
                await prisma.notificationSubscription.upsert({
                    where: {
                        userId_eventType: {
                            userId,
                            eventType: pref.eventType
                        }
                    },
                    update: {
                        inApp: pref.inApp,
                        email: pref.email
                    },
                    create: {
                        userId,
                        eventType: pref.eventType,
                        inApp: pref.inApp,
                        email: pref.email
                    }
                });
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error updating notification preferences:', error);
            return reply.status(500).send({ error: 'Failed to update notification preferences' });
        }
    });
}
export default managementRoutes;
