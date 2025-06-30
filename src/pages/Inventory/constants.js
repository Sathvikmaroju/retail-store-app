export const UNIT_TYPES = ["meter", "kilogram", "piece", "box"];

export const INITIAL_PRODUCT_STATE = {
  name: "",
  pricePerUnit: "",
  unitType: "piece",
  category: "",
  subCategory: "",
  vendorName: "",
  vendorDetails: { contact: "", vendor_desc: "" },
  purchaseQty: "",
  soldQty: "0",
  lowStockThreshold: "5",
};

export const INITIAL_RESTOCK_STATE = {
  purchaseQty: "",
  purchasePricePerUnit: "",
  vendorName: "",
  vendorDetails: { contact: "", vendor_desc: "" },
  notes: "",
};
