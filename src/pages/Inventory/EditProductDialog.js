import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Autocomplete,
} from "@mui/material";
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { UNIT_TYPES } from "./constants";

function EditProductDialog({
  open,
  onClose,
  product,
  categories,
  subCategories,
  onEdit,
  onUpdate,
  onDelete,
}) {
  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Product: {product.name}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 2,
            mt: 2,
          }}>
          <TextField
            label="Product Name"
            value={product.name}
            onChange={(e) => onEdit(product, "name", e.target.value)}
            size="small"
            required
          />
          <Autocomplete
            freeSolo
            options={categories}
            value={product.category}
            onChange={(event, newValue) =>
              onEdit(product, "category", newValue || "")
            }
            onInputChange={(event, newInputValue) =>
              onEdit(product, "category", newInputValue)
            }
            renderInput={(params) => (
              <TextField {...params} label="Category" size="small" required />
            )}
          />
          <Autocomplete
            freeSolo
            options={subCategories}
            value={product.subCategory || ""}
            onChange={(event, newValue) =>
              onEdit(product, "subCategory", newValue || "")
            }
            onInputChange={(event, newInputValue) =>
              onEdit(product, "subCategory", newInputValue)
            }
            renderInput={(params) => (
              <TextField {...params} label="Sub Category" size="small" />
            )}
          />
          <TextField
            select
            label="Unit Type"
            value={product.unitType}
            onChange={(e) => onEdit(product, "unitType", e.target.value)}
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
            value={product.pricePerUnit}
            onChange={(e) => onEdit(product, "pricePerUnit", e.target.value)}
            size="small"
            required
          />
          <TextField
            label="Purchase Price per Unit"
            type="number"
            value={product.purchasePricePerUnit || ""}
            onChange={(e) =>
              onEdit(product, "purchasePricePerUnit", e.target.value)
            }
            size="small"
          />
          <TextField
            label="Purchase Quantity"
            type="number"
            value={product.purchaseQty || ""}
            onChange={(e) => onEdit(product, "purchaseQty", e.target.value)}
            size="small"
          />
          <TextField
            label="Sold Quantity"
            type="number"
            value={product.soldQty || ""}
            onChange={(e) => onEdit(product, "soldQty", e.target.value)}
            size="small"
          />
          <TextField
            label="Low Stock Threshold"
            type="number"
            value={product.lowStockThreshold || ""}
            onChange={(e) =>
              onEdit(product, "lowStockThreshold", e.target.value)
            }
            size="small"
            helperText={`Max: ${product.purchaseQty || 0}`}
          />
          <TextField
            label="Vendor Name"
            value={product.vendorName || ""}
            onChange={(e) => onEdit(product, "vendorName", e.target.value)}
            size="small"
          />
          <TextField
            label="Vendor Contact"
            value={product.vendorDetails?.contact || ""}
            onChange={(e) =>
              onEdit(product, "vendorDetails", e.target.value, true, "contact")
            }
            size="small"
          />
          <TextField
            label="Vendor Description"
            value={product.vendorDetails?.vendor_desc || ""}
            onChange={(e) =>
              onEdit(
                product,
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button
          onClick={() => onDelete(product)}
          color="error"
          startIcon={<DeleteIcon />}>
          Delete
        </Button>
        <Button
          onClick={() => onUpdate(product)}
          variant="contained"
          startIcon={<SaveIcon />}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditProductDialog;
