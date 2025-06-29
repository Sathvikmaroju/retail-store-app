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
  query,
  where,
  orderBy,
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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tabs,
  Tab,
  Card,
  CardContent,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

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

const INITIAL_RESTOCK_STATE = {
  purchaseQty: "",
  purchasePricePerUnit: "",
  vendorName: "",
  vendorDetails: { contact: "", vendor_desc: "" },
  notes: "",
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

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

  // New states for enhanced features
  const [tabValue, setTabValue] = useState(0);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [productToRestock, setProductToRestock] = useState(null);
  const [restockData, setRestockData] = useState(INITIAL_RESTOCK_STATE);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState(null);

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

  // Fetch purchase history
  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const historySnapshot = await getDocs(
          query(
            collection(db, "purchaseHistory"),
            orderBy("purchaseDate", "desc")
          )
        );
        const historyList = historySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPurchaseHistory(historyList);
      } catch (error) {
        console.error("Error fetching purchase history:", error);
      }
    };

    fetchPurchaseHistory();
  }, []);

  // Filter subcategories based on selected category
  useEffect(() => {
    if (newProduct.category) {
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

  const handleRestockInputChange = (
    field,
    value,
    isNested = false,
    nestedField = null
  ) => {
    if (isNested) {
      setRestockData((prev) => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value,
        },
      }));
    } else {
      setRestockData((prev) => ({
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

    const purchaseQty = parseInt(newProduct.purchaseQty) || 0;
    const lowStockThreshold = parseInt(newProduct.lowStockThreshold) || 5;

    // Validate low stock threshold
    if (lowStockThreshold > purchaseQty) {
      validationErrors.push(
        "Low stock threshold cannot be greater than purchased quantity"
      );
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
      return;
    }

    setSubmitting(true);

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
      lowStockThreshold,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "categories", productData.category), {});
      if (productData.subCategory) {
        await setDoc(doc(db, "subCategories", productData.subCategory), {});
      }

      const productRef = await addDoc(collection(db, "products"), productData);

      // Create initial purchase history record
      await addDoc(collection(db, "purchaseHistory"), {
        productId: productRef.id,
        productName: productData.name,
        vendorName: productData.vendorName,
        vendorDetails: productData.vendorDetails,
        purchaseQty: productData.purchaseQty,
        purchasePricePerUnit: productData.purchasePricePerUnit,
        totalCost: productData.purchaseQty * productData.purchasePricePerUnit,
        purchaseDate: serverTimestamp(),
        type: "initial_stock",
        notes: "Initial stock entry",
      });

      setNewProduct(INITIAL_PRODUCT_STATE);
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add product:", err);
      setError("Error adding product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestock = async () => {
    if (
      !productToRestock ||
      !restockData.purchaseQty ||
      !restockData.purchasePricePerUnit
    ) {
      setError("Please fill in all required restock fields");
      return;
    }

    const addQty = parseInt(restockData.purchaseQty);
    const purchasePrice = parseFloat(restockData.purchasePricePerUnit);

    if (addQty <= 0 || purchasePrice <= 0) {
      setError("Invalid quantity or price");
      return;
    }

    try {
      // Update product quantities
      const productRef = doc(db, "products", productToRestock.id);
      const newPurchaseQty = (productToRestock.purchaseQty || 0) + addQty;
      const newRemainingQty = (productToRestock.remainingQty || 0) + addQty;

      await updateDoc(productRef, {
        purchaseQty: newPurchaseQty,
        remainingQty: newRemainingQty,
        lastRestockDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create purchase history record
      await addDoc(collection(db, "purchaseHistory"), {
        productId: productToRestock.id,
        productName: productToRestock.name,
        vendorName: restockData.vendorName || productToRestock.vendorName,
        vendorDetails: restockData.vendorDetails,
        purchaseQty: addQty,
        purchasePricePerUnit: purchasePrice,
        totalCost: addQty * purchasePrice,
        purchaseDate: serverTimestamp(),
        type: "restock",
        notes: restockData.notes || "",
      });

      setRestockDialogOpen(false);
      setProductToRestock(null);
      setRestockData(INITIAL_RESTOCK_STATE);
      setError("");
    } catch (err) {
      console.error("Failed to restock product:", err);
      setError("Error restocking product.");
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
      else if (remaining <= threshold) lowStock.push(p); // Changed from < to <=
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
    const lowStockThreshold = parseInt(product.lowStockThreshold) || 10;

    // Validate low stock threshold
    if (lowStockThreshold > purchaseQty) {
      setError("Low stock threshold cannot be greater than purchased quantity");
      return;
    }

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
      lowStockThreshold,
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
      setError("");
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

  const openRestockDialog = (product) => {
    setProductToRestock(product);
    setRestockData({
      ...INITIAL_RESTOCK_STATE,
      vendorName: product.vendorName,
      vendorDetails: product.vendorDetails,
    });
    setRestockDialogOpen(true);
  };

  const openHistoryDialog = async (product) => {
    setSelectedProductHistory(product);
    try {
      const historyQuery = query(
        collection(db, "purchaseHistory"),
        where("productId", "==", product.id),
        orderBy("purchaseDate", "desc")
      );
      const historySnapshot = await getDocs(historyQuery);
      const productHistory = historySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSelectedProductHistory({ ...product, history: productHistory });
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error fetching product history:", error);
    }
  };

  const inStock = filteredProducts.filter((p) => p.remainingQty > 0);
  const outOfStock = filteredProducts.filter((p) => (p.remainingQty || 0) <= 0);

  const renderAccordion = (data) =>
    data.map((product) => {
      const isLowStock =
        (product.remainingQty || 0) <= (product.lowStockThreshold || 10); // Changed from < to <=
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
                  helperText={`Max: ${currentProduct.purchaseQty || 0}`}
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

                {/* Action Buttons */}
                <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => setEditingProduct({ ...currentProduct })}
                    size="small">
                    Edit Product
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<TrendingUpIcon />}
                    onClick={() => openRestockDialog(currentProduct)}
                    size="small">
                    Restock
                  </Button>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<HistoryIcon />}
                    onClick={() => openHistoryDialog(currentProduct)}
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

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Current Inventory" />
          <Tab label="Purchase History" />
        </Tabs>
      </Box>

      {/* Tab 1: Current Inventory */}
      <TabPanel value={tabValue} index={0}>
        {/* Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Paper
              sx={{
                p: 2,
                textAlign: "center",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}>
              <Typography variant="subtitle2">Total Items</Typography>
              <Typography variant="h6">{products.length}</Typography>
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
              <Typography variant="subtitle2">Low Stock</Typography>
              <Typography variant="h6">
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
              <Typography variant="subtitle2">Out of Stock</Typography>
              <Typography variant="h6">
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
              <Typography variant="subtitle2">Available</Typography>
              <Typography variant="h6">
                {groupedProducts.available.length}
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
            onClick={() => setShowAddForm(!showAddForm)}
            startIcon={<AddIcon />}>
            {showAddForm ? "Hide Add Product Form" : "Add New Product"}
          </Button>
        </Stack>

        {/* Add Product Form */}
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
                onChange={(e) =>
                  handleInputChange("purchaseQty", e.target.value)
                }
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
                onChange={(e) =>
                  handleInputChange("vendorName", e.target.value)
                }
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
          </div>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Products Display */}
        <Typography variant="h5" color="green" gutterBottom>
          In Stock ({inStock.length})
        </Typography>
        {renderAccordion(inStock)}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" color="error" gutterBottom>
          Out of Stock ({outOfStock.length})
        </Typography>
        {renderAccordion(outOfStock)}
      </TabPanel>

      {/* Tab 2: Purchase History */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Purchase History
        </Typography>

        {purchaseHistory.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              No purchase history found
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="center">Unit Price</TableCell>
                  <TableCell align="center">Total Cost</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.purchaseDate?.toDate().toLocaleDateString() ||
                        "N/A"}
                    </TableCell>
                    <TableCell>{record.productName}</TableCell>
                    <TableCell>{record.vendorName || "N/A"}</TableCell>
                    <TableCell align="center">{record.purchaseQty}</TableCell>
                    <TableCell align="center">
                      ₹{record.purchasePricePerUnit}
                    </TableCell>
                    <TableCell align="center">
                      ₹{record.totalCost?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          record.type === "initial_stock"
                            ? "Initial Stock"
                            : "Restock"
                        }
                        size="small"
                        color={
                          record.type === "initial_stock"
                            ? "primary"
                            : "success"
                        }
                      />
                    </TableCell>
                    <TableCell>{record.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Restock Dialog */}
      <Dialog
        open={restockDialogOpen}
        onClose={() => setRestockDialogOpen(false)}
        maxWidth="sm"
        fullWidth>
        <DialogTitle>Restock Product: {productToRestock?.name}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom sx={{ mb: 2 }}>
            Current Stock:{" "}
            <strong>{productToRestock?.remainingQty || 0}</strong>
          </Typography>

          <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
            <TextField
              label="Additional Quantity *"
              type="number"
              value={restockData.purchaseQty}
              onChange={(e) =>
                handleRestockInputChange("purchaseQty", e.target.value)
              }
              inputProps={{ min: 1 }}
              required
              fullWidth
            />

            <TextField
              label="Purchase Price per Unit *"
              type="number"
              step="0.01"
              value={restockData.purchasePricePerUnit}
              onChange={(e) =>
                handleRestockInputChange("purchasePricePerUnit", e.target.value)
              }
              required
              fullWidth
            />

            <TextField
              label="Vendor Name"
              value={restockData.vendorName}
              onChange={(e) =>
                handleRestockInputChange("vendorName", e.target.value)
              }
              fullWidth
            />

            <TextField
              label="Vendor Contact"
              value={restockData.vendorDetails.contact}
              onChange={(e) =>
                handleRestockInputChange(
                  "vendorDetails",
                  e.target.value,
                  true,
                  "contact"
                )
              }
              fullWidth
            />

            <TextField
              label="Notes"
              value={restockData.notes}
              onChange={(e) =>
                handleRestockInputChange("notes", e.target.value)
              }
              multiline
              rows={3}
              fullWidth
              placeholder="e.g., Purchase order number, delivery details..."
            />

            {restockData.purchaseQty && restockData.purchasePricePerUnit && (
              <Typography variant="h6" color="primary">
                Total Cost: ₹
                {(
                  parseFloat(restockData.purchaseQty) *
                  parseFloat(restockData.purchasePricePerUnit)
                ).toFixed(2)}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestockDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRestock}
            variant="contained"
            disabled={
              !restockData.purchaseQty || !restockData.purchasePricePerUnit
            }>
            Restock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth>
        <DialogTitle>
          Purchase History: {selectedProductHistory?.name}
        </DialogTitle>
        <DialogContent>
          {selectedProductHistory?.history?.length === 0 ? (
            <Typography>No purchase history found for this product.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="center">Unit Price</TableCell>
                    <TableCell align="center">Total</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedProductHistory?.history?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.purchaseDate?.toDate().toLocaleDateString() ||
                          "N/A"}
                      </TableCell>
                      <TableCell>{record.vendorName || "N/A"}</TableCell>
                      <TableCell align="center">{record.purchaseQty}</TableCell>
                      <TableCell align="center">
                        ₹{record.purchasePricePerUnit}
                      </TableCell>
                      <TableCell align="center">
                        ₹{record.totalCost?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            record.type === "initial_stock"
                              ? "Initial"
                              : "Restock"
                          }
                          size="small"
                          color={
                            record.type === "initial_stock"
                              ? "primary"
                              : "success"
                          }
                        />
                      </TableCell>
                      <TableCell>{record.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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
