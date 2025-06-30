import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Box,
  TextField,
  Typography,
  Paper,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
} from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";

// Restock Dialog Component
export function RestockDialog({
  open,
  onClose,
  product,
  restockData,
  onInputChange,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Stock: {product?.name}</DialogTitle>
      <DialogContent>
        <Typography gutterBottom sx={{ mb: 2 }}>
          Current Stock: <strong>{product?.remainingQty || 0}</strong>
        </Typography>

        <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
          <TextField
            label="Additional Quantity *"
            type="number"
            value={restockData.purchaseQty}
            onChange={(e) => onInputChange("purchaseQty", e.target.value)}
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
              onInputChange("purchasePricePerUnit", e.target.value)
            }
            required
            fullWidth
          />

          <TextField
            label="Vendor Name"
            value={restockData.vendorName}
            onChange={(e) => onInputChange("vendorName", e.target.value)}
            fullWidth
          />

          <TextField
            label="Vendor Contact"
            value={restockData.vendorDetails.contact}
            onChange={(e) =>
              onInputChange("vendorDetails", e.target.value, true, "contact")
            }
            fullWidth
          />

          <TextField
            label="Notes"
            value={restockData.notes}
            onChange={(e) => onInputChange("notes", e.target.value)}
            multiline
            rows={3}
            fullWidth
            placeholder="e.g., Purchase order number, delivery details..."
          />

          {restockData.purchaseQty && restockData.purchasePricePerUnit && (
            <Paper sx={{ p: 2, backgroundColor: "#e3f2fd" }}>
              <Typography variant="h6" color="primary">
                Total Cost: ₹
                {(
                  parseFloat(restockData.purchaseQty) *
                  parseFloat(restockData.purchasePricePerUnit)
                ).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New Stock Level:{" "}
                {(product?.remainingQty || 0) +
                  parseInt(restockData.purchaseQty || 0)}
              </Typography>
            </Paper>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={
            !restockData.purchaseQty || !restockData.purchasePricePerUnit
          }>
          Update Stock
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Product History Dialog Component
export function ProductHistoryDialog({
  open,
  onClose,
  selectedProductHistory,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryIcon />
          Purchase History: {selectedProductHistory?.product?.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        {!selectedProductHistory?.history ||
        selectedProductHistory.history.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No purchase history found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This product has no recorded purchase transactions yet.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Product Summary */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: "#f5f5f5" }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Stock:
                  </Typography>
                  <Typography variant="h6">
                    {selectedProductHistory.product.remainingQty || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Purchases:
                  </Typography>
                  <Typography variant="h6">
                    {selectedProductHistory.history.length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Quantity Purchased:
                  </Typography>
                  <Typography variant="h6">
                    {selectedProductHistory.history.reduce(
                      (sum, record) => sum + (record.purchaseQty || 0),
                      0
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Cost:
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    ₹
                    {selectedProductHistory.history
                      .reduce((sum, record) => sum + (record.totalCost || 0), 0)
                      .toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Purchase History Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>
                      <strong>Date</strong>
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
                      <strong>Total</strong>
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
                  {selectedProductHistory.history.map((record, index) => (
                    <TableRow
                      key={record.id}
                      sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}>
                      <TableCell>
                        <Typography variant="body2">
                          {record.purchaseDate?.toDate().toLocaleDateString() ||
                            "N/A"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.purchaseDate?.toDate().toLocaleTimeString() ||
                            ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.vendorName || "N/A"}
                        </Typography>
                        {record.vendorDetails?.contact && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block">
                            📞 {record.vendorDetails.contact}
                          </Typography>
                        )}
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
                        {/* Price change indicator */}
                        {index < selectedProductHistory.history.length - 1 &&
                          selectedProductHistory.history[index + 1]
                            .purchasePricePerUnit !==
                            record.purchasePricePerUnit && (
                            <Typography
                              variant="caption"
                              color={
                                record.purchasePricePerUnit >
                                selectedProductHistory.history[index + 1]
                                  .purchasePricePerUnit
                                  ? "error.main"
                                  : "success.main"
                              }
                              display="block">
                              {record.purchasePricePerUnit >
                              selectedProductHistory.history[index + 1]
                                .purchasePricePerUnit
                                ? "↗"
                                : "↘"}
                              {Math.abs(
                                record.purchasePricePerUnit -
                                  selectedProductHistory.history[index + 1]
                                    .purchasePricePerUnit
                              ).toFixed(2)}
                            </Typography>
                          )}
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

            {/* Price Analysis */}
            {selectedProductHistory.history.length > 1 && (
              <Paper sx={{ p: 2, mt: 2, backgroundColor: "#e3f2fd" }}>
                <Typography variant="subtitle2" gutterBottom>
                  📈 Price Analysis
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Lowest Price:
                    </Typography>
                    <Typography variant="body1" color="success.main">
                      ₹
                      {Math.min(
                        ...selectedProductHistory.history.map(
                          (r) => r.purchasePricePerUnit
                        )
                      ).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Highest Price:
                    </Typography>
                    <Typography variant="body1" color="error.main">
                      ₹
                      {Math.max(
                        ...selectedProductHistory.history.map(
                          (r) => r.purchasePricePerUnit
                        )
                      ).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Average Price:
                    </Typography>
                    <Typography variant="body1">
                      ₹
                      {(
                        selectedProductHistory.history.reduce(
                          (sum, r) => sum + r.purchasePricePerUnit,
                          0
                        ) / selectedProductHistory.history.length
                      ).toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// Delete Confirmation Dialog Component
export function DeleteDialog({ open, onClose, product, onConfirm }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description">
      <DialogTitle id="delete-dialog-title">Delete Product</DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-dialog-description">
          Are you sure you want to delete "{product?.name}"? This action cannot
          be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
