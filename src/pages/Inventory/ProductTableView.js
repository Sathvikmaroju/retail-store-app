import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Box,
  Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  PriorityHigh as PriorityHighIcon,
} from "@mui/icons-material";

function ProductTableView({ products, onEdit, onRestock, onShowHistory }) {
  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
              Product Details
            </TableCell>
            <TableCell sx={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
              Category
            </TableCell>
            <TableCell
              sx={{
                backgroundColor: "#f5f5f5",
                fontWeight: "bold",
                textAlign: "center",
              }}>
              Stock Info
            </TableCell>
            <TableCell
              sx={{
                backgroundColor: "#f5f5f5",
                fontWeight: "bold",
                textAlign: "center",
              }}>
              Pricing
            </TableCell>
            <TableCell sx={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
              Vendor Details
            </TableCell>
            <TableCell
              sx={{
                backgroundColor: "#f5f5f5",
                fontWeight: "bold",
                textAlign: "center",
              }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => {
            const isLowStock =
              (product.remainingQty || 0) <= (product.lowStockThreshold || 10);
            const isOutOfStock = (product.remainingQty || 0) <= 0;

            return (
              <TableRow
                key={product.id}
                sx={{
                  "&:hover": { backgroundColor: "#f9f9f9" },
                  backgroundColor: isOutOfStock
                    ? "#ffebee"
                    : isLowStock
                    ? "#fff3e0"
                    : "inherit",
                }}>
                {/* Product Details */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {isOutOfStock && (
                      <PriorityHighIcon
                        sx={{ color: "error.main", fontSize: 18 }}
                      />
                    )}
                    {isLowStock && !isOutOfStock && (
                      <PriorityHighIcon
                        sx={{ color: "warning.main", fontSize: 18 }}
                      />
                    )}
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={
                          isLowStock || isOutOfStock ? "bold" : "normal"
                        }
                        sx={{ fontSize: "0.875rem" }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Unit: {product.unitType}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* Category */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                    {product.category}
                  </Typography>
                  {product.subCategory && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block">
                      {product.subCategory}
                    </Typography>
                  )}
                </TableCell>

                {/* Stock Info */}
                <TableCell align="center">
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
                    }}>
                    <Chip
                      label={`${product.remainingQty || 0}`}
                      size="small"
                      color={
                        isOutOfStock
                          ? "error"
                          : isLowStock
                          ? "warning"
                          : "success"
                      }
                      sx={{ minWidth: 50 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Purchased: {product.purchaseQty || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sold: {product.soldQty || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Threshold: {product.lowStockThreshold || 10}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Pricing */}
                <TableCell align="center">
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
                    }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="success.main">
                      ₹{product.pricePerUnit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sell Price
                    </Typography>
                    {product.purchasePricePerUnit && (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          ₹{product.purchasePricePerUnit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Cost Price
                        </Typography>
                        <Typography
                          variant="caption"
                          color="primary.main"
                          fontWeight="medium">
                          {(
                            ((product.pricePerUnit -
                              product.purchasePricePerUnit) /
                              product.purchasePricePerUnit) *
                            100
                          ).toFixed(1)}
                          % margin
                        </Typography>
                      </>
                    )}
                  </Box>
                </TableCell>

                {/* Vendor Details */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                    {product.vendorName || "N/A"}
                  </Typography>
                  {product.vendorDetails?.contact && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block">
                      📞 {product.vendorDetails.contact}
                    </Typography>
                  )}
                  {product.vendorDetails?.vendor_desc && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                      📝 {product.vendorDetails.vendor_desc}
                    </Typography>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell align="center">
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 0.5,
                    }}>
                    <Tooltip title="Edit Product">
                      <IconButton
                        size="small"
                        onClick={() => onEdit({ ...product })}
                        color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Update Stock">
                      <IconButton
                        size="small"
                        onClick={() => onRestock(product)}
                        color="success">
                        <TrendingUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Purchase History">
                      <IconButton
                        size="small"
                        onClick={() => onShowHistory(product)}
                        color="info">
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ProductTableView;
