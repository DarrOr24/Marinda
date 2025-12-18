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

    created_at: string;
    updated_at: string;
};
