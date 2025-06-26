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
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TableViewIcon from "@mui/icons-material/TableView";
import FilterListIcon from "@mui/icons-material/FilterList";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ErrorIcon from "@mui/icons-material/Error";
import AddIcon from "@mui/icons-material/Add";

const UNIT_TYPES = ["meter", "kilogram", "piece", "box"];
const INITIAL_PRODUCT_STATE = {
  name: "",
  pricePerUnit: "",
  purchasePricePerUnit: "",
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

  // New state for enhanced UX
  const [viewMode, setViewMode] = useState("accordion"); // 'accordion', 'table', 'cards'
  const [categoryFilter, setCategoryFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // 'all', 'low', 'out', 'available'
  const [showFilters, setShowFilters] = useState(false);

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
      setFilteredSubCategories(subCategories);
    } else {
      setFilteredSubCategories([]);
    }
  }, [newProduct.category, subCategories]);

  // Enhanced filtering logic
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          p.vendorName?.toLowerCase().includes(term) ||
          p.subCategory?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Vendor filter
    if (vendorFilter) {
      filtered = filtered.filter((p) => p.vendorName === vendorFilter);
    }

    // Stock filter
    if (stockFilter !== "all") {
      filtered = filtered.filter((p) => {
        const remaining = p.remainingQty || 0;
        const threshold = p.lowStockThreshold || 10;

        switch (stockFilter) {
          case "out":
            return remaining <= 0;
          case "low":
            return remaining > 0 && remaining < threshold;
          case "available":
            return remaining >= threshold;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, vendorFilter, stockFilter]);

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

  // Get unique categories and vendors for filters
  const uniqueCategories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];
  const uniqueVendors = [
    ...new Set(products.map((p) => p.vendorName).filter(Boolean)),
  ];

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

  const clearFilters = () => {
    setCategoryFilter("");
    setVendorFilter("");
    setStockFilter("all");
    setSearchTerm("");
  };

  // Render functions for different view modes
  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
            <TableCell>
              <strong>Product</strong>
            </TableCell>
            <TableCell>
              <strong>Category</strong>
            </TableCell>
            <TableCell>
              <strong>Stock</strong>
            </TableCell>
            <TableCell>
              <strong>Price</strong>
            </TableCell>
            <TableCell>
              <strong>Vendor</strong>
            </TableCell>
            <TableCell>
              <strong>Actions</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredProducts.map((product) => {
            const isLowStock =
              (product.remainingQty || 0) < (product.lowStockThreshold || 10);
            const isOutOfStock = (product.remainingQty || 0) <= 0;

            return (
              <TableRow
                key={product.id}
                sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {isOutOfStock && (
                      <ErrorIcon sx={{ color: "error.main", fontSize: 16 }} />
                    )}
                    {isLowStock && !isOutOfStock && (
                      <TrendingDownIcon
                        sx={{ color: "warning.main", fontSize: 16 }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      fontWeight={
                        isLowStock || isOutOfStock ? "bold" : "normal"
                      }>
                      {product.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{product.category}</Typography>
                  {product.subCategory && (
                    <Typography variant="caption" color="text.secondary">
                      {product.subCategory}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${product.remainingQty || 0} ${product.unitType}`}
                    size="small"
                    color={
                      isOutOfStock
                        ? "error"
                        : isLowStock
                        ? "warning"
                        : "success"
                    }
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    ₹{product.pricePerUnit}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {product.vendorName || "-"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => setEditingProduct({ ...product })}
                    color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCardView = () => (
    <Grid container spacing={2}>
      {filteredProducts.map((product) => {
        const isLowStock =
          (product.remainingQty || 0) < (product.lowStockThreshold || 10);
        const isOutOfStock = (product.remainingQty || 0) <= 0;

        return (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card
              sx={{
                height: "100%",
                border: isOutOfStock
                  ? "2px solid #f44336"
                  : isLowStock
                  ? "2px solid #ff9800"
                  : "1px solid #e0e0e0",
                "&:hover": { boxShadow: 3 },
              }}>
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  {isOutOfStock && <ErrorIcon sx={{ color: "error.main" }} />}
                  {isLowStock && !isOutOfStock && (
                    <TrendingDownIcon sx={{ color: "warning.main" }} />
                  )}
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {product.name}
                  </Typography>
                </Box>

                <Stack spacing={1}>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Category:
                    </Typography>
                    <Typography variant="body2">{product.category}</Typography>
                  </Box>

                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Stock:
                    </Typography>
                    <Chip
                      label={`${product.remainingQty || 0} ${product.unitType}`}
                      size="small"
                      color={
                        isOutOfStock
                          ? "error"
                          : isLowStock
                          ? "warning"
                          : "success"
                      }
                    />
                  </Box>

                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Price:
                    </Typography>
                    <Typography variant="body2">
                      ₹{product.pricePerUnit}
                    </Typography>
                  </Box>

                  {product.vendorName && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Vendor:
                      </Typography>
                      <Typography variant="body2">
                        {product.vendorName}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setEditingProduct({ ...product })}>
                  Edit
                </Button>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderAccordionView = () => {
    const inStock = filteredProducts.filter((p) => p.remainingQty > 0);
    const outOfStock = filteredProducts.filter(
      (p) => (p.remainingQty || 0) <= 0
    );

    const renderAccordion = (data, title, titleColor = "inherit") => (
      <>
        {data.length > 0 && (
          <>
            <Typography
              variant="h6"
              color={titleColor}
              gutterBottom
              sx={{ mt: 2 }}>
              {title} ({data.length})
            </Typography>
            {data.map((product) => {
              const isLowStock =
                (product.remainingQty || 0) < (product.lowStockThreshold || 10);
              const isEditing =
                editingProduct && editingProduct.id === product.id;
              const currentProduct = isEditing ? editingProduct : product;

              return (
                <Accordion key={product.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                      }}>
                      <Typography sx={{ flexGrow: 1 }}>
                        {currentProduct.name}
                      </Typography>
                      {isLowStock && (
                        <PriorityHighIcon sx={{ color: "red", mr: 1 }} />
                      )}
                      <Chip
                        label={`Qty: ${currentProduct.remainingQty || 0}`}
                        color={
                          currentProduct.remainingQty === 0
                            ? "error"
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
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(250px, 1fr))",
                          gap: 2,
                        }}>
                        <TextField
                          label="Product Name"
                          value={currentProduct.name}
                          onChange={(e) =>
                            handleProductEdit(
                              currentProduct,
                              "name",
                              e.target.value
                            )
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
                            handleProductEdit(
                              currentProduct,
                              "category",
                              newInputValue
                            )
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
                            <TextField
                              {...params}
                              label="Sub Category"
                              size="small"
                            />
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
                            handleProductEdit(
                              currentProduct,
                              "soldQty",
                              e.target.value
                            )
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
                          value={
                            currentProduct.vendorDetails?.vendor_desc || ""
                          }
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
                          <strong>Sold Qty:</strong>{" "}
                          {currentProduct.soldQty || 0}
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
                          <strong>Vendor:</strong>{" "}
                          {currentProduct.vendorName || "N/A"}
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
                            onClick={() =>
                              setEditingProduct({ ...currentProduct })
                            }
                            size="small">
                            Edit Product
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </>
        )}
      </>
    );

    return (
      <>
        {renderAccordion(inStock, "In Stock", "success.main")}
        {renderAccordion(outOfStock, "Out of Stock", "error.main")}
      </>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>Loading inventory...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <InventoryIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h4" component="h1">
          Inventory Management
        </Typography>
      </Box>

      {/* Summary Dashboard */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Paper
            sx={{
              p: 2,
              textAlign: "center",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            }}>
            <InventoryIcon sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="subtitle2">Total Items</Typography>
            <Typography variant="h5" fontWeight="bold">
              {products.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper
            sx={{
              p: 2,
              textAlign: "center",
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
            }}>
            <TrendingDownIcon sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="subtitle2">Low Stock</Typography>
            <Typography variant="h5" fontWeight="bold">
              {groupedProducts.lowStock.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper
            sx={{
              p: 2,
              textAlign: "center",
              background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
              color: "white",
            }}>
            <ErrorIcon sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="subtitle2">Out of Stock</Typography>
            <Typography variant="h5" fontWeight="bold">
              {groupedProducts.outOfStock.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper
            sx={{
              p: 2,
              textAlign: "center",
              background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
              color: "#333",
            }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
              <Typography variant="h4">📊</Typography>
            </Box>
            <Typography variant="subtitle2">Available</Typography>
            <Typography variant="h5" fontWeight="bold">
              {groupedProducts.available.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Search, Filters, and View Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Top Row: Search and Add Button */}
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              variant="outlined"
              placeholder="Search by product name, category, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
              size="small"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowAddForm(!showAddForm)}
              sx={{ minWidth: 160 }}>
              {showAddForm ? "Hide Form" : "Add Product"}
            </Button>
          </Stack>

          {/* Second Row: Filters and View Toggle */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setShowFilters(!showFilters)}
                size="small">
                Filters
              </Button>

              {/* Active filter chips */}
              {(categoryFilter || vendorFilter || stockFilter !== "all") && (
                <Stack direction="row" spacing={1}>
                  {categoryFilter && (
                    <Chip
                      label={`Category: ${categoryFilter}`}
                      onDelete={() => setCategoryFilter("")}
                      size="small"
                      color="primary"
                    />
                  )}
                  {vendorFilter && (
                    <Chip
                      label={`Vendor: ${vendorFilter}`}
                      onDelete={() => setVendorFilter("")}
                      size="small"
                      color="primary"
                    />
                  )}
                  {stockFilter !== "all" && (
                    <Chip
                      label={`Stock: ${stockFilter}`}
                      onDelete={() => setStockFilter("all")}
                      size="small"
                      color="primary"
                    />
                  )}
                  <Button size="small" onClick={clearFilters}>
                    Clear All
                  </Button>
                </Stack>
              )}
            </Stack>

            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small">
              <ToggleButton value="accordion">
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton value="table">
                <TableViewIcon />
              </ToggleButton>
              <ToggleButton value="cards">
                <ViewModuleIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Expandable Filters */}
          <Collapse in={showFilters}>
            <Stack
              direction="row"
              spacing={2}
              sx={{ pt: 2, borderTop: "1px solid #e0e0e0" }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category">
                  <MenuItem value="">All Categories</MenuItem>
                  {uniqueCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Vendor</InputLabel>
                <Select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  label="Vendor">
                  <MenuItem value="">All Vendors</MenuItem>
                  {uniqueVendors.map((vendor) => (
                    <MenuItem key={vendor} value={vendor}>
                      {vendor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Stock Status</InputLabel>
                <Select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  label="Stock Status">
                  <MenuItem value="all">All Items</MenuItem>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="low">Low Stock</MenuItem>
                  <MenuItem value="out">Out of Stock</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Collapse>
        </Stack>
      </Paper>

      {/* Add Product Form */}
      <Collapse in={showAddForm}>
        <Paper sx={{ p: 3, mb: 3, background: "#f8f9fa" }}>
          <Typography variant="h6" gutterBottom>
            Add New Product
          </Typography>
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
              size="large"
              sx={{ maxWidth: 300 }}>
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
        </Paper>
      </Collapse>

      {/* Results Summary */}
      {(searchTerm ||
        categoryFilter ||
        vendorFilter ||
        stockFilter !== "all") && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredProducts.length} of {products.length} products
          </Typography>
        </Box>
      )}

      {/* Products Display based on view mode */}
      <Box sx={{ mt: 3 }}>
        {filteredProducts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              No products found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {products.length === 0
                ? "Add your first product to get started"
                : "Try adjusting your search or filters"}
            </Typography>
          </Paper>
        ) : (
          <>
            {viewMode === "table" && renderTableView()}
            {viewMode === "cards" && renderCardView()}
            {viewMode === "accordion" && renderAccordionView()}
          </>
        )}
      </Box>

      {/* Edit Product Dialog */}
      {editingProduct && viewMode !== "accordion" && (
        <Dialog
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          maxWidth="md"
          fullWidth>
          <DialogTitle>Edit Product: {editingProduct.name}</DialogTitle>
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
                value={editingProduct.name}
                onChange={(e) =>
                  handleProductEdit(editingProduct, "name", e.target.value)
                }
                size="small"
                required
              />
              <Autocomplete
                freeSolo
                options={categories}
                value={editingProduct.category}
                onChange={(event, newValue) =>
                  handleProductEdit(editingProduct, "category", newValue || "")
                }
                onInputChange={(event, newInputValue) =>
                  handleProductEdit(editingProduct, "category", newInputValue)
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
                value={editingProduct.subCategory || ""}
                onChange={(event, newValue) =>
                  handleProductEdit(
                    editingProduct,
                    "subCategory",
                    newValue || ""
                  )
                }
                onInputChange={(event, newInputValue) =>
                  handleProductEdit(
                    editingProduct,
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
                value={editingProduct.unitType}
                onChange={(e) =>
                  handleProductEdit(editingProduct, "unitType", e.target.value)
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
                value={editingProduct.pricePerUnit}
                onChange={(e) =>
                  handleProductEdit(
                    editingProduct,
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
                value={editingProduct.purchasePricePerUnit || ""}
                onChange={(e) =>
                  handleProductEdit(
                    editingProduct,
                    "purchasePricePerUnit",
                    e.target.value
                  )
                }
                size="small"
              />
              <TextField
                label="Purchase Quantity"
                type="number"
                value={editingProduct.purchaseQty || ""}
                onChange={(e) =>
                  handleProductEdit(
                    editingProduct,
                    "purchaseQty",
                    e.target.value
                  )
                }
                size="small"
              />
              <TextField
                label="Sold Quantity"
                type="number"
                value={editingProduct.soldQty || ""}
                onChange={(e) =>
                  handleProductEdit(editingProduct, "soldQty", e.target.value)
                }
                size="small"
              />
              <TextField
                label="Low Stock Threshold"
                type="number"
                value={editingProduct.lowStockThreshold || ""}
                onChange={(e) =>
                  handleProductEdit(
                    editingProduct,
                    "lowStockThreshold",
                    e.target.value
                  )
                }
                size="small"
              />
              <TextField
                label="Vendor Name"
                value={editingProduct.vendorName || ""}
                onChange={(e) =>
                  handleProductEdit(
                    editingProduct,
                    "vendorName",
                    e.target.value
                  )
                }
                size="small"
              />
              <TextField
                label="Vendor Contact"
                value={editingProduct.vendorDetails?.contact || ""}
                onChange={(e) =>
                  handleProductEdit(
                    editingProduct,
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
                value={editingProduct.vendorDetails?.vendor_desc || ""}
                onChange={(e) =>
                  handleProductEdit(
                    editingProduct,
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
            <Button onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button
              onClick={() => openDeleteDialog(editingProduct)}
              color="error"
              startIcon={<DeleteIcon />}>
              Delete
            </Button>
            <Button
              onClick={() => handleUpdateProduct(editingProduct)}
              variant="contained"
              startIcon={<SaveIcon />}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      )}

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
