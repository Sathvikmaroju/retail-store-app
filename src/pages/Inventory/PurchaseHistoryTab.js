import React from "react";
import {
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Button,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";

function PurchaseHistoryTab({
  purchaseHistory,
  filteredPurchaseHistory,
  historySearchTerm,
  selectedProduct,
  selectedVendor,
  dateFilter,
  typeFilter,
  uniqueProducts,
  uniqueVendors,
  onSearchChange,
  onProductChange,
  onVendorChange,
  onDateChange,
  onTypeChange,
  onClearFilters,
}) {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Purchase History & Analytics
      </Typography>

      {/* Enhanced Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          🔍 Search & Filters
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              placeholder="Search by product, vendor, or notes..."
              value={historySearchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Product</InputLabel>
              <Select
                value={selectedProduct}
                onChange={(e) => onProductChange(e.target.value)}
                label="Product">
                <MenuItem value="">All Products</MenuItem>
                {uniqueProducts.map((product) => (
                  <MenuItem key={product} value={product}>
                    {product}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Vendor</InputLabel>
              <Select
                value={selectedVendor}
                onChange={(e) => onVendorChange(e.target.value)}
                label="Vendor">
                <MenuItem value="">All Vendors</MenuItem>
                {uniqueVendors.map((vendor) => (
                  <MenuItem key={vendor} value={vendor}>
                    {vendor}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateFilter}
                onChange={(e) => onDateChange(e.target.value)}
                label="Date Range">
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => onTypeChange(e.target.value)}
                label="Type">
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="initial_stock">Initial Stock</MenuItem>
                <MenuItem value="restock">Restock</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
          }}>
          {(historySearchTerm ||
            selectedProduct ||
            selectedVendor ||
            dateFilter !== "all" ||
            typeFilter !== "all") && (
            <>
              <Typography variant="body2" color="text.secondary">
                Active filters:
              </Typography>
              {historySearchTerm && (
                <Chip
                  label={`Search: ${historySearchTerm}`}
                  onDelete={() => onSearchChange("")}
                  size="small"
                />
              )}
              {selectedProduct && (
                <Chip
                  label={`Product: ${selectedProduct}`}
                  onDelete={() => onProductChange("")}
                  size="small"
                />
              )}
              {selectedVendor && (
                <Chip
                  label={`Vendor: ${selectedVendor}`}
                  onDelete={() => onVendorChange("")}
                  size="small"
                />
              )}
              {dateFilter !== "all" && (
                <Chip
                  label={`Date: ${dateFilter}`}
                  onDelete={() => onDateChange("all")}
                  size="small"
                />
              )}
              {typeFilter !== "all" && (
                <Chip
                  label={`Type: ${typeFilter}`}
                  onDelete={() => onTypeChange("all")}
                  size="small"
                />
              )}
              <Button size="small" onClick={onClearFilters}>
                Clear All
              </Button>
            </>
          )}
        </Box>

        {/* Summary Statistics */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="primary">
                  {filteredPurchaseHistory.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Records
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="success.main">
                  ₹
                  {filteredPurchaseHistory
                    .reduce((sum, record) => sum + (record.totalCost || 0), 0)
                    .toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Cost
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="info.main">
                  {filteredPurchaseHistory.reduce(
                    (sum, record) => sum + (record.purchaseQty || 0),
                    0
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Quantity
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="warning.main">
                  {
                    filteredPurchaseHistory.filter((r) => r.type === "restock")
                      .length
                  }
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Restocks
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredPurchaseHistory.length} of {purchaseHistory.length}{" "}
        records
      </Typography>

      {/* Purchase History Table */}
      {filteredPurchaseHistory.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            No purchase history found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {purchaseHistory.length === 0
              ? "No purchase records exist yet"
              : "Try adjusting your search or filters"}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>
                  <strong>Date</strong>
                </TableCell>
                <TableCell>
                  <strong>Product</strong>
                </TableCell>
                <TableCell>
                  <strong>Vendor</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Quantity</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Unit Price</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Total Cost</strong>
                </TableCell>
                <TableCell>
                  <strong>Type</strong>
                </TableCell>
                <TableCell>
                  <strong>Notes</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPurchaseHistory.map((record) => (
                <TableRow
                  key={record.id}
                  sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}>
                  <TableCell>
                    <Typography variant="body2">
                      {record.purchaseDate?.toDate().toLocaleDateString() ||
                        "N/A"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {record.purchaseDate?.toDate().toLocaleTimeString() || ""}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {record.productName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {record.purchaseQty}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      ₹{record.purchasePricePerUnit}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="success.main">
                      ₹{record.totalCost?.toFixed(2)}
                    </Typography>
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
                        record.type === "initial_stock" ? "primary" : "success"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {record.notes || "-"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}

export default PurchaseHistoryTab;
