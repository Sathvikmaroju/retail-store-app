import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  Autocomplete,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  PriorityHigh as PriorityHighIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { UNIT_TYPES } from "./constants";

function ProductAccordion({
  products,
  editingProduct,
  categories,
  subCategories,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onRestock,
  onShowHistory,
}) {
  return products.map((product) => {
    const isLowStock =
      (product.remainingQty || 0) <= (product.lowStockThreshold || 10);
    const isEditing = editingProduct && editingProduct.id === product.id;
    const currentProduct = isEditing ? editingProduct : product;

    return (
      <Accordion key={product.id}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            <Typography sx={{ flexGrow: 1 }}>{currentProduct.name}</Typography>
            {isLowStock && <PriorityHighIcon sx={{ color: "red", mr: 1 }} />}
            <Chip
              label={`Qty: ${currentProduct.remainingQty || 0}`}
              color={
                currentProduct.remainingQty === 0
                  ? "error"
                  : isLowStock
                  ? "warning"
                  : "success"
              }
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {isEditing ? (
            // Edit Mode
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 2,
              }}>
              <TextField
                label="Product Name"
                value={currentProduct.name}
                onChange={(e) => onEdit(currentProduct, "name", e.target.value)}
                size="small"
                required
              />
              <Autocomplete
                freeSolo
                options={categories}
                value={currentProduct.category}
                onChange={(event, newValue) =>
                  onEdit(currentProduct, "category", newValue || "")
                }
                onInputChange={(event, newInputValue) =>
                  onEdit(currentProduct, "category", newInputValue)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    size="small"
                    required
                  />
                )}
              />
              <Autocomplete
                freeSolo
                options={subCategories}
                value={currentProduct.subCategory || ""}
                onChange={(event, newValue) =>
                  onEdit(currentProduct, "subCategory", newValue || "")
                }
                onInputChange={(event, newInputValue) =>
                  onEdit(currentProduct, "subCategory", newInputValue)
                }
                renderInput={(params) => (
                  <TextField {...params} label="Sub Category" size="small" />
                )}
              />
              <TextField
                select
                label="Unit Type"
                value={currentProduct.unitType}
                onChange={(e) =>
                  onEdit(currentProduct, "unitType", e.target.value)
                }
                size="small"
                SelectProps={{ native: true }}>
                {UNIT_TYPES.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </TextField>
              <TextField
                label="Price per Unit"
                type="number"
                value={currentProduct.pricePerUnit}
                onChange={(e) =>
                  onEdit(currentProduct, "pricePerUnit", e.target.value)
                }
                size="small"
                required
              />
              <TextField
                label="Purchase Price per Unit"
                type="number"
                value={currentProduct.purchasePricePerUnit || ""}
                onChange={(e) =>
                  onEdit(currentProduct, "purchasePricePerUnit", e.target.value)
                }
                size="small"
              />
              <TextField
                label="Purchase Quantity"
                type="number"
                value={currentProduct.purchaseQty || ""}
                onChange={(e) =>
                  onEdit(currentProduct, "purchaseQty", e.target.value)
                }
                size="small"
              />
              <TextField
                label="Sold Quantity"
                type="number"
                value={currentProduct.soldQty || ""}
                onChange={(e) =>
                  onEdit(currentProduct, "soldQty", e.target.value)
                }
                size="small"
              />
              <TextField
                label="Low Stock Threshold"
                type="number"
                value={currentProduct.lowStockThreshold || ""}
                onChange={(e) =>
                  onEdit(currentProduct, "lowStockThreshold", e.target.value)
                }
                size="small"
                helperText={`Max: ${currentProduct.purchaseQty || 0}`}
              />
              <TextField
                label="Vendor Name"
                value={currentProduct.vendorName || ""}
                onChange={(e) =>
                  onEdit(currentProduct, "vendorName", e.target.value)
                }
                size="small"
              />
              <TextField
                label="Vendor Contact"
                value={currentProduct.vendorDetails?.contact || ""}
                onChange={(e) =>
                  onEdit(
                    currentProduct,
                    "vendorDetails",
                    e.target.value,
                    true,
                    "contact"
                  )
                }
                size="small"
              />
              <TextField
                label="Vendor Description"
                value={currentProduct.vendorDetails?.vendor_desc || ""}
                onChange={(e) =>
                  onEdit(
                    currentProduct,
                    "vendorDetails",
                    e.target.value,
                    true,
                    "vendor_desc"
                  )
                }
                size="small"
                multiline
                rows={2}
                sx={{ gridColumn: "span 2" }}
              />

              {/* Action Buttons */}
              <Box
                sx={{
                  gridColumn: "span 2",
                  display: "flex",
                  gap: 1,
                  justifyContent: "flex-start",
                  mt: 2,
                }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={() => onUpdate(currentProduct)}
                  size="small">
                  Save Changes
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<CancelIcon />}
                  onClick={onCancelEdit}
                  size="small">
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDelete(currentProduct)}
                  size="small">
                  Delete Product
                </Button>
              </Box>
            </Box>
          ) : (
            // View Mode
            <Box>
              <Typography>
                <strong>Category:</strong> {currentProduct.category} /{" "}
                {currentProduct.subCategory || "-"}
              </Typography>
              <Typography>
                <strong>Unit:</strong> {currentProduct.unitType}
              </Typography>
              <Typography>
                <strong>Selling Price per Unit:</strong> ₹
                {currentProduct.pricePerUnit}
              </Typography>
              {currentProduct.purchasePricePerUnit && (
                <Typography>
                  <strong>Purchase Price per Unit:</strong> ₹
                  {currentProduct.purchasePricePerUnit}
                </Typography>
              )}
              <Typography>
                <strong>Purchase Qty:</strong> {currentProduct.purchaseQty || 0}
              </Typography>
              <Typography>
                <strong>Sold Qty:</strong> {currentProduct.soldQty || 0}
              </Typography>
              <Typography>
                <strong>Remaining Qty:</strong>{" "}
                {currentProduct.remainingQty || 0}
              </Typography>
              <Typography>
                <strong>Low Stock Threshold:</strong>{" "}
                {currentProduct.lowStockThreshold || 10}
              </Typography>
              <Typography>
                <strong>Vendor:</strong> {currentProduct.vendorName || "N/A"}
              </Typography>
              {currentProduct.vendorDetails?.contact && (
                <Typography>
                  <strong>Vendor Contact:</strong>{" "}
                  {currentProduct.vendorDetails.contact}
                </Typography>
              )}
              {currentProduct.vendorDetails?.vendor_desc && (
                <Typography>
                  <strong>Vendor Description:</strong>{" "}
                  {currentProduct.vendorDetails.vendor_desc}
                </Typography>
              )}

              {/* Action Buttons */}
              <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={() => onEdit({ ...currentProduct })}
                  size="small">
                  Edit Product
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => onRestock(currentProduct)}
                  size="small">
                  Update Stock
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<HistoryIcon />}
                  onClick={() => onShowHistory(currentProduct)}
                  size="small">
                  History
                </Button>
              </Box>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    );
  });
}

export default ProductAccordion;
