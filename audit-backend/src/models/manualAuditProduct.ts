export interface ManualAuditProduct {
    id?: number;
    productId: string;
    productTitle: string;
    productImage: string;
    images: string;
    categoryName: string;
    categoryImage: string;
    description: string;
    price: number;
    shopId: string;
    shopName: string;
    auditReason: string;
    rejectionReason: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ManualAuditProductRow {
    id: number;
    product_id: string;
    product_title: string;
    product_image: string;
    images: string;
    category_name: string;
    category_image: string;
    description: string;
    price: number;
    shop_id: string;
    shop_name: string;
    audit_reason: string;
    rejection_reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: Date;
    updated_at: Date;
}
