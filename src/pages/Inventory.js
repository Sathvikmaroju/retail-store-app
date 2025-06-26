import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  Typography,
  TextField,
  Button,
  Box,
  Accordion,
  Grid,
  Paper,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Stack,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Autocomplete,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

const UNIT_TYPES = ["meter", "kilogram", "piece", "box"];
const INITIAL_PRODUCT_STATE = {
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

function Inventory() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState(INITIAL_PRODUCT_STATE);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const updatedProducts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(updatedProducts);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching products:", error);
        setError("Failed to load products. Please refresh the page.");
        setLoading(false);
      }
    );

    const fetchMeta = async () => {
      try {
        const catSnap = await getDocs(collection(db, "categories"));
        const subCatSnap = await getDocs(collection(db, "subCategories"));

        const categoriesData = catSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const subCategoriesData = subCatSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCategories(categoriesData.map((cat) => cat.id));
        setSubCategories(subCategoriesData.map((sub) => sub.id));
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchMeta();

    return () => unsubscribe();
  }, []);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (newProduct.category) {
      // For now, show all subcategories. In a real app, you might want to filter by category
      setFilteredSubCategories(subCategories);
    } else {
      setFilteredSubCategories([]);
    }
  }, [newProduct.category, subCategories]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.vendorName?.toLowerCase().includes(term) ||
        p.subCategory?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleInputChange = (
    field,
    value,
    isNested = false,
    nestedField = null
  ) => {
    if (isNested) {
      setNewProduct((prev) => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value,
        },
      }));
    } else {
      setNewProduct((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError("");

    const validationErrors = [];
    if (!newProduct.name.trim())
      validationErrors.push("Product name is required");
    if (!newProduct.pricePerUnit || isNaN(newProduct.pricePerUnit))
      validationErrors.push("Valid selling price is required");
    if (
      !newProduct.purchasePricePerUnit ||
      isNaN(newProduct.purchasePricePerUnit)
    )
      validationErrors.push("Valid purchase price is required");
    if (!newProduct.category.trim())
      validationErrors.push("Category is required");

    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
      return;
    }

    setSubmitting(true);

    const purchaseQty = parseInt(newProduct.purchaseQty) || 0;
    const soldQty = parseInt(newProduct.soldQty) || 0;

    const productData = {
      ...newProduct,
      name: newProduct.name.trim(),
      category: newProduct.category.trim(),
      subCategory: newProduct.subCategory.trim(),
      vendorName: newProduct.vendorName.trim(),
      pricePerUnit: parseFloat(newProduct.pricePerUnit),
      purchasePricePerUnit: parseFloat(newProduct.purchasePricePerUnit),
      purchaseQty,
      soldQty,
      remainingQty: purchaseQty - soldQty,
      lowStockThreshold: parseInt(newProduct.lowStockThreshold) || 10,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "categories", productData.category), {});
      if (productData.subCategory) {
        await setDoc(doc(db, "subCategories", productData.subCategory), {});
      }
      await addDoc(collection(db, "products"), productData);
      setNewProduct(INITIAL_PRODUCT_STATE);
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add product:", err);
      setError("Error adding product.");
    } finally {
      setSubmitting(false);
    }
  };

  const groupedProducts = useMemo(() => {
    const lowStock = [];
    const outOfStock = [];
    const available = [];

    filteredProducts.forEach((p) => {
      const remaining = p.remainingQty || 0;
      const threshold = p.lowStockThreshold || 10;
      if (remaining <= 0) outOfStock.push(p);
      else if (remaining < threshold) lowStock.push(p);
      else available.push(p);
    });

    return { lowStock, outOfStock, available };
  }, [filteredProducts]);

  const handleProductEdit = (
    product,
    field,
    value,
    isNested = false,
    nestedField = null
  ) => {
    const updatedProduct = { ...product };
    if (isNested) {
      updatedProduct[field] = {
        ...updatedProduct[field],
        [nestedField]: value,
      };
    } else {
      updatedProduct[field] = value;
    }
    setEditingProduct(updatedProduct);
  };

  const handleUpdateProduct = async (product) => {
    const purchaseQty = parseInt(product.purchaseQty) || 0;
    const soldQty = parseInt(product.soldQty) || 0;
    const updatedProduct = {
      ...product,
      name: product.name.trim(),
      category: product.category.trim(),
      subCategory: product.subCategory.trim(),
      vendorName: product.vendorName.trim(),
      pricePerUnit: parseFloat(product.pricePerUnit),
      purchasePricePerUnit: parseFloat(product.purchasePricePerUnit),
      purchaseQty,
      soldQty,
      remainingQty: purchaseQty - soldQty,
      lowStockThreshold: parseInt(product.lowStockThreshold) || 10,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "categories", updatedProduct.category), {});
      if (updatedProduct.subCategory) {
        await setDoc(doc(db, "subCategories", updatedProduct.subCategory), {});
      }
      const productRef = doc(db, "products", product.id);
      await updateDoc(productRef, updatedProduct);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      setError("Failed to update product.");
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, "products", productToDelete.id));
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error deleting product:", error);
      setError("Failed to delete product.");
    }
  };

  const openDeleteDialog = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const inStock = filteredProducts.filter((p) => p.remainingQty > 0);
  const outOfStock = filteredProducts.filter((p) => (p.remainingQty || 0) <= 0);

  const renderAccordion = (data) =>
    data.map((product) => {
      const isLowStock =
        (product.remainingQty || 0) < (product.lowStockThreshold || 10);
      const isEditing = editingProduct && editingProduct.id === product.id;
      const currentProduct = isEditing ? editingProduct : product;

      return (
        <Accordion key={product.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                {currentProduct.name}
              </Typography>
              {isLowStock && <PriorityHighIcon sx={{ color: "red", mr: 1 }} />}
              <Chip
                label={`Qty: ${currentProduct.remainingQty || 0}`}
                color={currentProduct.remainingQty === 0 ? "error" : "success"}
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
                  onChange={(e) =>
                    handleProductEdit(currentProduct, "name", e.target.value)
                  }
                  size="small"
                  required
                />
                <Autocomplete
                  freeSolo
                  options={categories}
                  value={currentProduct.category}
                  onChange={(event, newValue) =>
                    handleProductEdit(
                      currentProduct,
                      "category",
                      newValue || ""
                    )
                  }
                  onInputChange={(event, newInputValue) =>
                    handleProductEdit(currentProduct, "category", newInputValue)
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
                    handleProductEdit(
                      currentProduct,
                      "subCategory",
                      newValue || ""
                    )
                  }
                  onInputChange={(event, newInputValue) =>
                    handleProductEdit(
                      currentProduct,
                      "subCategory",
                      newInputValue
                    )
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
                    handleProductEdit(
                      currentProduct,
                      "unitType",
                      e.target.value
                    )
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
                    handleProductEdit(
                      currentProduct,
                      "pricePerUnit",
                      e.target.value
                    )
                  }
                  size="small"
                  required
                />
                <TextField
                  label="Purchase Price per Unit"
                  type="number"
                  value={currentProduct.purchasePricePerUnit || ""}
                  onChange={(e) =>
                    handleProductEdit(
                      currentProduct,
                      "purchasePricePerUnit",
                      e.target.value
                    )
                  }
                  size="small"
                />
                <TextField
                  label="Purchase Quantity"
                  type="number"
                  value={currentProduct.purchaseQty || ""}
                  onChange={(e) =>
                    handleProductEdit(
                      currentProduct,
                      "purchaseQty",
                      e.target.value
                    )
                  }
                  size="small"
                />
                <TextField
                  label="Sold Quantity"
                  type="number"
                  value={currentProduct.soldQty || ""}
                  onChange={(e) =>
                    handleProductEdit(currentProduct, "soldQty", e.target.value)
                  }
                  size="small"
                />
                <TextField
                  label="Low Stock Threshold"
                  type="number"
                  value={currentProduct.lowStockThreshold || ""}
                  onChange={(e) =>
                    handleProductEdit(
                      currentProduct,
                      "lowStockThreshold",
                      e.target.value
                    )
                  }
                  size="small"
                />
                <TextField
                  label="Vendor Name"
                  value={currentProduct.vendorName || ""}
                  onChange={(e) =>
                    handleProductEdit(
                      currentProduct,
                      "vendorName",
                      e.target.value
                    )
                  }
                  size="small"
                />
                <TextField
                  label="Vendor Contact"
                  value={currentProduct.vendorDetails?.contact || ""}
                  onChange={(e) =>
                    handleProductEdit(
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
                    handleProductEdit(
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
                    onClick={() => handleUpdateProduct(currentProduct)}
                    size="small">
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<CancelIcon />}
                    onClick={() => setEditingProduct(null)}
                    size="small">
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => openDeleteDialog(currentProduct)}
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
                  <strong>Purchase Qty:</strong>{" "}
                  {currentProduct.purchaseQty || 0}
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

                {/* Action Button */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => setEditingProduct({ ...currentProduct })}
                    size="small">
                    Edit Product
                  </Button>
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      );
    });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Inventory
      </Typography>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="subtitle2">Total Items</Typography>
            <Typography variant="h6">{products.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="subtitle2">Low Stock</Typography>
            <Typography variant="h6" color="warning.main">
              {groupedProducts.lowStock.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="subtitle2">Out of Stock</Typography>
            <Typography variant="h6" color="error.main">
              {groupedProducts.outOfStock.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search Bar and Add Button */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}>
        <TextField
          variant="outlined"
          placeholder="Search inventory by product name, category, or vendor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, mr: 2 }}
        />
        <Button
          variant="contained"
          onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Hide Add Product Form" : "Add New Product"}
        </Button>
      </Stack>

      {/* Add Product Form - Now positioned below the search bar and button */}
      {showAddForm && (
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
              onChange={(e) => handleInputChange("name", e.target.value)}
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
              onChange={(e) =>
                handleInputChange("pricePerUnit", e.target.value)
              }
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
                handleInputChange("purchasePricePerUnit", e.target.value)
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
              onChange={(e) => handleInputChange("unitType", e.target.value)}
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
                handleInputChange("category", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleInputChange("category", newInputValue);
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

                // Add "Create new category" option if input doesn't match any existing
                if (
                  inputValue !== "" &&
                  !options.some(
                    (option) =>
                      option.toLowerCase() === inputValue.toLowerCase()
                  )
                ) {
                  filtered.push(`Create "${inputValue}"`);
                }

                return filtered;
              }}
              getOptionLabel={(option) => {
                if (
                  typeof option === "string" &&
                  option.startsWith('Create "')
                ) {
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
                handleInputChange("subCategory", newValue || "");
              }}
              onInputChange={(event, newInputValue) => {
                handleInputChange("subCategory", newInputValue);
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

                // Add "Create new subcategory" option if input doesn't match any existing
                if (
                  inputValue !== "" &&
                  !options.some(
                    (option) =>
                      option.toLowerCase() === inputValue.toLowerCase()
                  )
                ) {
                  filtered.push(`Create "${inputValue}"`);
                }

                return filtered;
              }}
              getOptionLabel={(option) => {
                if (
                  typeof option === "string" &&
                  option.startsWith('Create "')
                ) {
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
              onChange={(e) => handleInputChange("purchaseQty", e.target.value)}
              size="small"
              fullWidth
              inputProps={{ min: 0 }}
            />

            {/* Sold Quantity */}
            <TextField
              label="Sold Quantity"
              type="number"
              value={newProduct.soldQty}
              onChange={(e) => handleInputChange("soldQty", e.target.value)}
              size="small"
              fullWidth
              inputProps={{ min: 0 }}
            />

            {/* Low Stock Threshold */}
            <TextField
              label="Low Stock Threshold"
              type="number"
              value={newProduct.lowStockThreshold}
              onChange={(e) =>
                handleInputChange("lowStockThreshold", e.target.value)
              }
              size="small"
              fullWidth
              inputProps={{ min: 0 }}
              helperText="Alert when stock falls below this number"
            />

            {/* Vendor Name */}
            <TextField
              label="Vendor Name"
              value={newProduct.vendorName}
              onChange={(e) => handleInputChange("vendorName", e.target.value)}
              size="small"
              fullWidth
            />

            {/* Vendor Contact */}
            <TextField
              label="Vendor Contact"
              value={newProduct.vendorDetails.contact}
              onChange={(e) =>
                handleInputChange(
                  "vendorDetails",
                  e.target.value,
                  true,
                  "contact"
                )
              }
              size="small"
              fullWidth
            />

            {/* Vendor Description - Full Width */}
            <TextField
              label="Vendor Description"
              value={newProduct.vendorDetails.vendor_desc}
              onChange={(e) =>
                handleInputChange(
                  "vendorDetails",
                  e.target.value,
                  true,
                  "vendor_desc"
                )
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
              onClick={handleAddProduct}
              disabled={submitting}
              fullWidth
              size="large">
              {submitting ? "Adding Product..." : "Add Product"}
            </Button>
          </Box>

          {/* Error Display */}
          {error && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "#ffebee",
                border: "1px solid #f44336",
                borderRadius: 1,
                color: "error.main",
              }}>
              {error}
            </Box>
          )}
        </div>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Products Display */}
      <Typography variant="h5" color="green" gutterBottom>
        In Stock
      </Typography>
      {renderAccordion(inStock)}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" color="error" gutterBottom>
        Out of Stock
      </Typography>
      {renderAccordion(outOfStock)}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description">
        <DialogTitle id="delete-dialog-title">Delete Product</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{productToDelete?.name}"? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteProduct}
            color="error"
            variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Inventory;
