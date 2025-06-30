import React from "react";
import { Box, TextField, Button, Autocomplete } from "@mui/material";
import { UNIT_TYPES } from "./constants";

function ProductForm({
  newProduct,
  categories,
  filteredSubCategories,
  submitting,
  onInputChange,
  onSubmit,
}) {
  return (
    <div
      style={{
        backgroundColor: "#f9f9f9",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "30px",
      }}>
      <h3>Add New Product</h3>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 2,
        }}>
        {/* Product Name */}
        <TextField
          label="Product Name *"
          value={newProduct.name}
          onChange={(e) => onInputChange("name", e.target.value)}
          size="small"
          required
          fullWidth
        />

        {/* Price per Unit */}
        <TextField
          label="Selling Price per Unit *"
          type="number"
          step="0.01"
          value={newProduct.pricePerUnit}
          onChange={(e) => onInputChange("pricePerUnit", e.target.value)}
          size="small"
          required
          fullWidth
        />

        {/* Purchase Price per Unit */}
        <TextField
          label="Purchase Price per Unit *"
          type="number"
          step="0.01"
          value={newProduct.purchasePricePerUnit}
          onChange={(e) =>
            onInputChange("purchasePricePerUnit", e.target.value)
          }
          size="small"
          required
          fullWidth
        />

        {/* Unit Type */}
        <TextField
          select
          label="Unit Type"
          value={newProduct.unitType}
          onChange={(e) => onInputChange("unitType", e.target.value)}
          size="small"
          fullWidth
          SelectProps={{ native: true }}>
          {UNIT_TYPES.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </TextField>

        {/* Category with Autocomplete */}
        <Autocomplete
          freeSolo
          options={categories}
          value={newProduct.category}
          onChange={(event, newValue) => {
            onInputChange("category", newValue || "");
          }}
          onInputChange={(event, newInputValue) => {
            onInputChange("category", newInputValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Category *"
              size="small"
              required
              helperText="Type to search existing categories or create new"
            />
          )}
          filterOptions={(options, { inputValue }) => {
            const filtered = options.filter((option) =>
              option.toLowerCase().includes(inputValue.toLowerCase())
            );

            if (
              inputValue !== "" &&
              !options.some(
                (option) => option.toLowerCase() === inputValue.toLowerCase()
              )
            ) {
              filtered.push(`Create "${inputValue}"`);
            }

            return filtered;
          }}
          getOptionLabel={(option) => {
            if (typeof option === "string" && option.startsWith('Create "')) {
              return option.replace('Create "', "").replace('"', "");
            }
            return option;
          }}
        />

        {/* Sub Category with Autocomplete */}
        <Autocomplete
          freeSolo
          options={filteredSubCategories}
          value={newProduct.subCategory}
          onChange={(event, newValue) => {
            onInputChange("subCategory", newValue || "");
          }}
          onInputChange={(event, newInputValue) => {
            onInputChange("subCategory", newInputValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Sub Category"
              size="small"
              helperText="Type to search existing subcategories or create new"
            />
          )}
          filterOptions={(options, { inputValue }) => {
            const filtered = options.filter((option) =>
              option.toLowerCase().includes(inputValue.toLowerCase())
            );

            if (
              inputValue !== "" &&
              !options.some(
                (option) => option.toLowerCase() === inputValue.toLowerCase()
              )
            ) {
              filtered.push(`Create "${inputValue}"`);
            }

            return filtered;
          }}
          getOptionLabel={(option) => {
            if (typeof option === "string" && option.startsWith('Create "')) {
              return option.replace('Create "', "").replace('"', "");
            }
            return option;
          }}
        />

        {/* Purchase Quantity */}
        <TextField
          label="Purchase Quantity"
          type="number"
          value={newProduct.purchaseQty}
          onChange={(e) => onInputChange("purchaseQty", e.target.value)}
          size="small"
          fullWidth
          inputProps={{ min: 0 }}
        />

        {/* Sold Quantity */}
        <TextField
          label="Sold Quantity"
          type="number"
          value={newProduct.soldQty}
          onChange={(e) => onInputChange("soldQty", e.target.value)}
          size="small"
          fullWidth
          inputProps={{ min: 0 }}
        />

        {/* Low Stock Threshold */}
        <TextField
          label="Low Stock Threshold"
          type="number"
          value={newProduct.lowStockThreshold}
          onChange={(e) => onInputChange("lowStockThreshold", e.target.value)}
          size="small"
          fullWidth
          inputProps={{
            min: 0,
            max: parseInt(newProduct.purchaseQty) || 999999,
          }}
          helperText={`Alert when stock falls to or below this number (Max: ${
            newProduct.purchaseQty || "N/A"
          })`}
        />

        {/* Vendor Name */}
        <TextField
          label="Vendor Name"
          value={newProduct.vendorName}
          onChange={(e) => onInputChange("vendorName", e.target.value)}
          size="small"
          fullWidth
        />

        {/* Vendor Contact */}
        <TextField
          label="Vendor Contact"
          value={newProduct.vendorDetails.contact}
          onChange={(e) =>
            onInputChange("vendorDetails", e.target.value, true, "contact")
          }
          size="small"
          fullWidth
        />

        {/* Vendor Description - Full Width */}
        <TextField
          label="Vendor Description"
          value={newProduct.vendorDetails.vendor_desc}
          onChange={(e) =>
            onInputChange("vendorDetails", e.target.value, true, "vendor_desc")
          }
          size="small"
          fullWidth
          multiline
          rows={3}
          sx={{ gridColumn: { xs: "1", sm: "span 2" } }}
        />
      </Box>

      {/* Submit Button */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={submitting}
          fullWidth
          size="large">
          {submitting ? "Adding Product..." : "Add Product"}
        </Button>
      </Box>
    </div>
  );
}

export default ProductForm;
