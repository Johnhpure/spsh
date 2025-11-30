import { databaseManager } from '../utils/database';
import { ManualAuditProduct, ManualAuditProductRow } from '../models/manualAuditProduct';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

class ManualAuditService {
    async addProduct(product: ManualAuditProduct): Promise<void> {
        // Check if exists
        const checkSql = 'SELECT id FROM manual_audit_products WHERE product_id = ? AND status = "pending"';
        const existing = await databaseManager.query<RowDataPacket[]>(checkSql, [product.productId]);
        if (existing.length > 0) {
            return; // Already pending
        }

        const sql = `
      INSERT INTO manual_audit_products (
        product_id, product_title, product_image, images,
        category_name, category_image, description, price,
        shop_id, shop_name, audit_reason, rejection_reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

        const params = [
            product.productId,
            product.productTitle,
            product.productImage,
            product.images,
            product.categoryName,
            product.categoryImage,
            product.description,
            product.price,
            product.shopId,
            product.shopName,
            product.auditReason,
            product.rejectionReason
        ];

        await databaseManager.query<ResultSetHeader>(sql, params);
    }

    async getPendingProducts(page: number = 1, limit: number = 20): Promise<{ records: ManualAuditProduct[], total: number }> {
        const offset = (page - 1) * limit;

        const countSql = 'SELECT COUNT(*) as total FROM manual_audit_products WHERE status = "pending"';
        const countResult = await databaseManager.query<(RowDataPacket & { total: number })[]>(countSql);
        const total = countResult[0].total;

        const sql = `
      SELECT * FROM manual_audit_products 
      WHERE status = "pending"
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

        const rows = await databaseManager.query<(ManualAuditProductRow & RowDataPacket)[]>(sql, [limit, offset]);

        const records = rows.map(this.mapRowToProduct);

        return { records, total };
    }

    async auditProduct(id: number, status: 'approved' | 'rejected', reason?: string): Promise<void> {
        const sql = 'UPDATE manual_audit_products SET status = ?, rejection_reason = ? WHERE id = ?';
        // If approved, we might want to clear rejection reason or keep it as history? 
        // Usually if approved, the rejection reason from AI is overridden.
        // But here 'reason' arg is for human rejection reason.
        // If approved, reason is null.

        await databaseManager.query<ResultSetHeader>(sql, [status, reason || null, id]);
    }

    private mapRowToProduct(row: ManualAuditProductRow): ManualAuditProduct {
        return {
            id: row.id,
            productId: row.product_id,
            productTitle: row.product_title,
            productImage: row.product_image,
            images: row.images,
            categoryName: row.category_name,
            categoryImage: row.category_image,
            description: row.description,
            price: row.price,
            shopId: row.shop_id,
            shopName: row.shop_name,
            auditReason: row.audit_reason,
            rejectionReason: row.rejection_reason,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

export const manualAuditService = new ManualAuditService();
export default manualAuditService;
