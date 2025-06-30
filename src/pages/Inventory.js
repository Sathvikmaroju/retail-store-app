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
  Grid,
  Paper,
  Divider,
  Stack,
  Tabs,
  Tab,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Add as AddIcon,
  Inventory as InventoryIcon,
  ViewList as ViewListIcon,
  TableView as TableViewIcon,
} from "@mui/icons-material";

// Import our components
import {
  INITIAL_PRODUCT_STATE,
  INITIAL_RESTOCK_STATE,
} from "./Inventory/constants";
import TabPanel from "./Inventory/TabPanel";
import ProductForm from "./Inventory/ProductForm";
import ProductAccordion from "./Inventory/ProductAccordion";
import ProductTableView from "./Inventory/ProductTableView";
import EditProductDialog from "./Inventory/EditProductDialog";
import PurchaseHistoryTab from "./Inventory/PurchaseHistoryTab";
import {
  RestockDialog,
  ProductHistoryDialog,
  DeleteDialog,
} from "./Inventory/Dialogs";

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

  // View mode state
  const [viewMode, setViewMode] = useState("accordion"); // "accordion" or "table"
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // New states for enhanced features
  const [tabValue, setTabValue] = useState(0);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [productToRestock, setProductToRestock] = useState(null);
  const [restockData, setRestockData] = useState(INITIAL_RESTOCK_STATE);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState(null);

  // Purchase History filters
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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

  // Enhanced purchase history filtering
  const filteredPurchaseHistory = useMemo(() => {
    let filtered = purchaseHistory;

    // Search filter
    if (historySearchTerm) {
      const term = historySearchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.productName?.toLowerCase().includes(term) ||
          record.vendorName?.toLowerCase().includes(term) ||
          record.notes?.toLowerCase().includes(term)
      );
    }

    // Product filter
    if (selectedProduct) {
      filtered = filtered.filter(
        (record) => record.productName === selectedProduct
      );
    }

    // Vendor filter
    if (selectedVendor) {
      filtered = filtered.filter(
        (record) => record.vendorName === selectedVendor
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      filtered = filtered.filter((record) => {
        const recordDate = record.purchaseDate?.toDate();
        if (!recordDate) return false;

        switch (dateFilter) {
          case "today":
            return recordDate >= startOfDay;
          case "week":
            const weekAgo = new Date(
              startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000
            );
            return recordDate >= weekAgo;
          case "month":
            const monthAgo = new Date(
              startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            return recordDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((record) => record.type === typeFilter);
    }

    return filtered;
  }, [
    purchaseHistory,
    historySearchTerm,
    selectedProduct,
    selectedVendor,
    dateFilter,
    typeFilter,
  ]);

  // Get unique products and vendors for filters
  const uniqueProducts = [
    ...new Set(purchaseHistory.map((record) => record.productName)),
  ].filter(Boolean);
  const uniqueVendors = [
    ...new Set(purchaseHistory.map((record) => record.vendorName)),
  ].filter(Boolean);

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

  // Handle edit button click - opens dialog for table view, inline for accordion
  const handleEditClick = (product) => {
    if (viewMode === "table") {
      setEditingProduct({ ...product });
      setEditDialogOpen(true);
    } else {
      setEditingProduct({ ...product });
    }
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
      setEditDialogOpen(false);
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

  // FIXED: Now properly fetches and displays product-specific history
  const openHistoryDialog = async (product) => {
    try {
      // Clear any previous error
      setError("");

      // Debug log to check the product ID
      console.log(
        "Fetching history for product:",
        product.name,
        "ID:",
        product.id
      );

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

      console.log("Found history records:", productHistory.length);

      setSelectedProductHistory({
        product: product,
        history: productHistory,
      });
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error fetching product history:", error);
      console.error("Product ID:", product.id);
      console.error("Error details:", error.message);

      // Try alternative query without orderBy in case of index issues
      try {
        console.log("Trying alternative query without orderBy...");
        const alternativeQuery = query(
          collection(db, "purchaseHistory"),
          where("productId", "==", product.id)
        );

        const alternativeSnapshot = await getDocs(alternativeQuery);
        const productHistory = alternativeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort manually
        productHistory.sort((a, b) => {
          const dateA = a.purchaseDate?.seconds || 0;
          const dateB = b.purchaseDate?.seconds || 0;
          return dateB - dateA;
        });

        console.log(
          "Alternative query found history records:",
          productHistory.length
        );

        setSelectedProductHistory({
          product: product,
          history: productHistory,
        });
        setHistoryDialogOpen(true);
      } catch (altError) {
        console.error("Alternative query also failed:", altError);
        setError(`Failed to load product history: ${error.message}`);
      }
    }
  };

  const clearHistoryFilters = () => {
    setHistorySearchTerm("");
    setSelectedProduct("");
    setSelectedVendor("");
    setDateFilter("all");
    setTypeFilter("all");
  };

  const inStock = filteredProducts.filter((p) => p.remainingQty > 0);
  const outOfStock = filteredProducts.filter((p) => (p.remainingQty || 0) <= 0);

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

        {/* Search Bar, Add Button, and View Toggle */}
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

          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => {
              if (newMode !== null) {
                setViewMode(newMode);
                // Clear editing state when switching views
                setEditingProduct(null);
                setEditDialogOpen(false);
              }
            }}
            size="small"
            sx={{ mr: 2 }}>
            <ToggleButton value="accordion" aria-label="accordion view">
              <ViewListIcon />
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <TableViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            onClick={() => setShowAddForm(!showAddForm)}
            startIcon={<AddIcon />}>
            {showAddForm ? "Hide Add Product Form" : "Add New Product"}
          </Button>
        </Stack>

        {/* Add Product Form */}
        {showAddForm && (
          <ProductForm
            newProduct={newProduct}
            categories={categories}
            filteredSubCategories={filteredSubCategories}
            submitting={submitting}
            onInputChange={handleInputChange}
            onSubmit={handleAddProduct}
          />
        )}

        <Divider sx={{ my: 3 }} />

        {/* Products Display - Conditional based on view mode */}
        {viewMode === "accordion" ? (
          <>
            {/* Accordion View */}
            <Typography variant="h5" color="green" gutterBottom>
              In Stock ({inStock.length})
            </Typography>
            <ProductAccordion
              products={inStock}
              editingProduct={editingProduct}
              categories={categories}
              subCategories={subCategories}
              onEdit={handleProductEdit}
              onUpdate={handleUpdateProduct}
              onCancelEdit={() => setEditingProduct(null)}
              onDelete={openDeleteDialog}
              onRestock={openRestockDialog}
              onShowHistory={openHistoryDialog}
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h5" color="error" gutterBottom>
              Out of Stock ({outOfStock.length})
            </Typography>
            <ProductAccordion
              products={outOfStock}
              editingProduct={editingProduct}
              categories={categories}
              subCategories={subCategories}
              onEdit={handleProductEdit}
              onUpdate={handleUpdateProduct}
              onCancelEdit={() => setEditingProduct(null)}
              onDelete={openDeleteDialog}
              onRestock={openRestockDialog}
              onShowHistory={openHistoryDialog}
            />
          </>
        ) : (
          <>
            {/* Table View */}
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              📊 All Products ({filteredProducts.length})
              <Typography variant="body2" color="text.secondary">
                • {inStock.length} In Stock • {outOfStock.length} Out of Stock
              </Typography>
            </Typography>
            <ProductTableView
              products={filteredProducts}
              onEdit={handleEditClick}
              onRestock={openRestockDialog}
              onShowHistory={openHistoryDialog}
            />
          </>
        )}
      </TabPanel>

      {/* Tab 2: Purchase History - ENHANCED WITH BETTER FILTERS */}
      <TabPanel value={tabValue} index={1}>
        <PurchaseHistoryTab
          purchaseHistory={purchaseHistory}
          filteredPurchaseHistory={filteredPurchaseHistory}
          historySearchTerm={historySearchTerm}
          selectedProduct={selectedProduct}
          selectedVendor={selectedVendor}
          dateFilter={dateFilter}
          typeFilter={typeFilter}
          uniqueProducts={uniqueProducts}
          uniqueVendors={uniqueVendors}
          onSearchChange={setHistorySearchTerm}
          onProductChange={setSelectedProduct}
          onVendorChange={setSelectedVendor}
          onDateChange={setDateFilter}
          onTypeChange={setTypeFilter}
          onClearFilters={clearHistoryFilters}
        />
      </TabPanel>

      {/* Dialogs */}
      <RestockDialog
        open={restockDialogOpen}
        onClose={() => setRestockDialogOpen(false)}
        product={productToRestock}
        restockData={restockData}
        onInputChange={handleRestockInputChange}
        onConfirm={handleRestock}
      />

      <ProductHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        selectedProductHistory={selectedProductHistory}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        product={productToDelete}
        onConfirm={handleDeleteProduct}
      />

      {/* Edit Product Dialog for Table View */}
      <EditProductDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        categories={categories}
        subCategories={subCategories}
        onEdit={handleProductEdit}
        onUpdate={(product) => {
          handleUpdateProduct(product);
          setEditDialogOpen(false);
        }}
        onDelete={(product) => {
          setEditDialogOpen(false);
          openDeleteDialog(product);
        }}
      />
    </Box>
  );
}

export default Inventory;
