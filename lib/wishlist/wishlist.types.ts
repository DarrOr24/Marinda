export type WishlistItem = {
    id: string;
    family_id: string;
    member_id: string;

    title: string;
    price: number | null;
    link: string | null;
    note: string | null;

    image_url: string | null;

    status: "open" | "fulfilled";

    fulfillment_mode: "parents" | "self";
    fulfilled_by: string | null;
    fulfilled_at: string | null;
    payment_method: string | null;

    created_at: string;
    updated_at: string;
};
