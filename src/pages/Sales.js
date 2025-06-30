// src/pages/Sales.js
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  DateRange as DateRangeIcon,
  AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import { db, auth } from "../firebase/firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

const Sales = ({ userRole, currentUser }) => {
  const [transactions, setTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        let q;

        if (userRole === "admin") {
          // Admin sees all transactions
          q = query(
            collection(db, "transactions"),
            orderBy("timestamp", "desc")
          );
        } else {
          // Staff sees only their transactions
          q = query(
            collection(db, "transactions"),
            where("userId", "==", currentUser?.uid || ""),
            orderBy("timestamp", "desc")
          );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const transactionsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setTransactions(transactionsList);
          groupTransactionsBySession(transactionsList);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError("Failed to load transactions");
        setLoading(false);
      }
    };

    // Fetch all users for admin staff filter
    const fetchUsers = async () => {
      if (userRole === "admin") {
        try {
          const usersSnapshot = await getDocs(collection(db, "users"));
          const usersList = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAllUsers(usersList);
        } catch (err) {
          console.error("Error fetching users:", err);
        }
      }
    };

    if (currentUser) {
      fetchTransactions();
      fetchUsers();
    }
  }, [userRole, currentUser]);

  // Group transactions by timestamp (same session)
  const groupTransactionsBySession = (transactionsList) => {
    const grouped = {};

    transactionsList.forEach((transaction) => {
      const sessionKey = `${transaction.userId}_${
        transaction.timestamp?.seconds || Date.now()
      }`;

      if (!grouped[sessionKey]) {
        grouped[sessionKey] = {
          sessionId: sessionKey,
          timestamp: transaction.timestamp,
          userId: transaction.userId,
          customerName: transaction.customerName,
          customerMobile: transaction.customerMobile,
          customerEmail: transaction.customerEmail,
          paymentType: transaction.paymentType,
          items: [],
          totalAmount: 0,
        };
      }

      grouped[sessionKey].items.push(transaction);
      grouped[sessionKey].totalAmount += transaction.total || 0;
    });

    const groupedArray = Object.values(grouped).sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    });

    setGroupedTransactions(groupedArray);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = groupedTransactions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (session) =>
          session.customerName?.toLowerCase().includes(term) ||
          session.customerMobile?.includes(term) ||
          session.items.some((item) =>
            item.productName?.toLowerCase().includes(term)
          )
      );
    }

    // Staff filter (admin only)
    if (userRole === "admin" && staffFilter !== "all") {
      filtered = filtered.filter((session) => session.userId === staffFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      filtered = filtered.filter((session) => {
        const sessionDate = session.timestamp?.toDate();
        if (!sessionDate) return false;

        switch (dateFilter) {
          case "today":
            return sessionDate >= startOfDay;
          case "week":
            const weekAgo = new Date(
              startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000
            );
            return sessionDate >= weekAgo;
          case "month":
            const monthAgo = new Date(
              startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            return sessionDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Payment filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter(
        (session) => session.paymentType === paymentFilter
      );
    }

    return filtered;
  }, [
    groupedTransactions,
    searchTerm,
    dateFilter,
    paymentFilter,
    staffFilter,
    userRole,
  ]);

  const handleDeleteItem = async () => {
    if (!itemToDelete || !deleteReason.trim()) {
      setError("Please provide a reason for deletion");
      return;
    }

    if (
      !returnQuantity ||
      returnQuantity <= 0 ||
      returnQuantity > itemToDelete.quantity
    ) {
      setError("Invalid return quantity");
      return;
    }

    try {
      const returnAmount =
        (itemToDelete.total / itemToDelete.quantity) * returnQuantity;

      console.log("Processing return:", {
        productId: itemToDelete.productId,
        productName: itemToDelete.productName,
        returnQuantity,
        returnAmount,
      });

      // Create a return/refund record
      await addDoc(collection(db, "returns"), {
        originalTransactionId: itemToDelete.id,
        productId: itemToDelete.productId,
        productName: itemToDelete.productName,
        originalQuantity: itemToDelete.quantity,
        returnQuantity: returnQuantity,
        unitPrice: itemToDelete.pricePerUnit,
        returnAmount: returnAmount,
        reason: deleteReason.trim(),
        processedBy: currentUser?.uid || "unknown",
        processedAt: serverTimestamp(),
        customerName: itemToDelete.customerName || null,
        customerMobile: itemToDelete.customerMobile || null,
        customerEmail: itemToDelete.customerEmail || null,
      });

      if (returnQuantity === itemToDelete.quantity) {
        // Full return - mark transaction as returned
        const transactionRef = doc(db, "transactions", itemToDelete.id);
        await updateDoc(transactionRef, {
          isReturned: true,
          returnReason: deleteReason.trim(),
          returnedAt: serverTimestamp(),
          returnedBy: currentUser?.uid || "unknown",
          returnQuantity: returnQuantity,
        });
      } else {
        // Partial return - create new transaction record for the partial return
        // and update the original transaction
        const transactionRef = doc(db, "transactions", itemToDelete.id);
        const newQuantity = itemToDelete.quantity - returnQuantity;
        const newTotal = itemToDelete.pricePerUnit * newQuantity;

        await updateDoc(transactionRef, {
          quantity: newQuantity,
          total: newTotal,
          hasPartialReturn: true,
          lastPartialReturnAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Create a separate record for the returned portion
        await addDoc(collection(db, "transactions"), {
          productId: itemToDelete.productId,
          productName: itemToDelete.productName,
          quantity: returnQuantity,
          pricePerUnit: itemToDelete.pricePerUnit,
          total: returnAmount,
          timestamp: itemToDelete.timestamp,
          userId: itemToDelete.userId,
          paymentType: itemToDelete.paymentType,
          customerName: itemToDelete.customerName || null,
          customerMobile: itemToDelete.customerMobile || null,
          customerEmail: itemToDelete.customerEmail || null,
          isReturned: true,
          isPartialReturn: true,
          originalTransactionId: itemToDelete.id,
          returnReason: deleteReason.trim(),
          returnedAt: serverTimestamp(),
          returnedBy: currentUser?.uid || "unknown",
        });
      }

      // Update product stock (add back the returned quantity)
      try {
        const productRef = doc(db, "products", itemToDelete.productId);
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
          const productData = productDoc.data();
          const currentRemaining = productData.remainingQty || 0;
          const currentSold = productData.soldQty || 0;

          await updateDoc(productRef, {
            remainingQty: currentRemaining + returnQuantity,
            soldQty: Math.max(0, currentSold - returnQuantity),
            updatedAt: serverTimestamp(),
          });

          console.log(
            `Updated product ${itemToDelete.productName}: +${returnQuantity} to inventory`
          );
        } else {
          console.warn(
            `Product ${itemToDelete.productId} not found for inventory update`
          );
        }
      } catch (inventoryError) {
        console.error("Error updating inventory:", inventoryError);
        // Don't throw error, just log it - return process should continue
      }

      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setDeleteReason("");
      setReturnQuantity(1);
      setError("");
    } catch (err) {
      console.error("Error processing return:", err);
      setError(`Failed to process return: ${err.message}`);
    }
  };

  const openDeleteDialog = (item) => {
    setItemToDelete(item);
    setReturnQuantity(1); // Default to 1 item
    setDeleteReason("");
    setDeleteDialogOpen(true);
  };

  const calculateTotalSales = () => {
    return filteredTransactions.reduce((total, session) => {
      const sessionTotal = session.items
        .filter((item) => !item.isReturned)
        .reduce((sum, item) => sum + (item.total || 0), 0);
      return total + sessionTotal;
    }, 0);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    return timestamp.toDate().toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>Loading transactions...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <ReceiptIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h4" component="h1">
          Sales Transactions
        </Typography>
        {userRole === "staff" && (
          <Chip label="Your Transactions Only" color="info" size="small" />
        )}
      </Box>

      {/* Summary Cards - Only for Admin */}
      {userRole === "admin" && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}>
              <CardContent sx={{ textAlign: "center" }}>
                <MoneyIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="subtitle2">Total Sales</Typography>
                <Typography variant="h5" fontWeight="bold">
                  ₹{calculateTotalSales().toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
              }}>
              <CardContent sx={{ textAlign: "center" }}>
                <ReceiptIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="subtitle2">Total Transactions</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {filteredTransactions.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                color: "#333",
              }}>
              <CardContent sx={{ textAlign: "center" }}>
                <PersonIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="subtitle2">Unique Customers</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {
                    new Set(
                      filteredTransactions
                        .map((t) => t.customerMobile)
                        .filter(Boolean)
                    ).size
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card
              sx={{
                background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
                color: "#333",
              }}>
              <CardContent sx={{ textAlign: "center" }}>
                <DateRangeIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="subtitle2">Items Sold</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {filteredTransactions.reduce(
                    (total, session) =>
                      total +
                      session.items.filter((item) => !item.isReturned).length,
                    0
                  )}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center">
          <TextField
            placeholder="Search by customer, mobile, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            size="small"
          />

          {/* Staff Filter - Admin Only */}
          {userRole === "admin" && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Staff Filter</InputLabel>
              <Select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                label="Staff Filter">
                <MenuItem value="all">All Staff</MenuItem>
                {allUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.email.split("@")[0]} ({user.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Filter</InputLabel>
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              label="Date Filter">
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="month">Last 30 Days</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Payment</InputLabel>
            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              label="Payment">
              <MenuItem value="all">All Payments</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="Card">Card</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Transactions List */}
      <Box>
        {filteredTransactions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              No transactions found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {transactions.length === 0
                ? "No transactions have been made yet"
                : "Try adjusting your search or filters"}
            </Typography>
          </Paper>
        ) : (
          filteredTransactions.map((session) => (
            <Accordion key={session.sessionId} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    gap: 2,
                  }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                      Transaction - {formatDate(session.timestamp)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {session.customerName
                        ? `${session.customerName} • ${
                            session.customerMobile || "No mobile"
                          }`
                        : "Walk-in Customer"}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {/* Return Status Indicators */}
                    {session.items.some((item) => item.isReturned) && (
                      <Chip
                        icon={
                          <Typography sx={{ fontSize: "14px" }}>↩️</Typography>
                        }
                        label="Has Returns"
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    )}
                    {session.items.some((item) => item.hasPartialReturn) && (
                      <Chip
                        icon={
                          <Typography sx={{ fontSize: "14px" }}>⚠️</Typography>
                        }
                        label="Partial Returns"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}

                    <Chip
                      label={session.paymentType}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={`₹${session.items
                        .filter((item) => !item.isReturned)
                        .reduce((sum, item) => sum + (item.total || 0), 0)
                        .toFixed(2)}`}
                      size="small"
                      color="success"
                    />
                    <Typography variant="body2" color="text.secondary">
                      {session.items.filter((item) => !item.isReturned).length}{" "}
                      items
                      {session.items.some(
                        (item) => item.isReturned || item.hasPartialReturn
                      ) && (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: "12px",
                            color: "error.main",
                            ml: 0.5,
                          }}>
                          (
                          {
                            session.items.filter((item) => item.isReturned)
                              .length
                          }{" "}
                          returned)
                        </Typography>
                      )}
                    </Typography>
                  </Stack>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="center">Unit Price</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {session.items.map((item) => (
                        <TableRow
                          key={item.id}
                          sx={{
                            backgroundColor: item.isReturned
                              ? "#ffebee"
                              : "inherit",
                            opacity: item.isReturned ? 0.7 : 1,
                          }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.productName}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="center">
                            ₹{item.pricePerUnit}
                          </TableCell>
                          <TableCell align="center">
                            ₹{item.total?.toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            {item.isReturned ? (
                              <Tooltip title={`Returned: ${item.returnReason}`}>
                                <Chip
                                  label={
                                    item.isPartialReturn
                                      ? "Partial Return"
                                      : "Returned"
                                  }
                                  size="small"
                                  color="error"
                                />
                              </Tooltip>
                            ) : item.hasPartialReturn ? (
                              <Tooltip title="Some items were returned from this transaction">
                                <Chip
                                  label="Partial Return"
                                  size="small"
                                  color="warning"
                                />
                              </Tooltip>
                            ) : (
                              <Chip label="Sold" size="small" color="success" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {!item.isReturned && (
                              <Tooltip title="Process Return">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => openDeleteDialog(item)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Customer Details */}
                {(session.customerName || session.customerEmail) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Customer Details:
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      {session.customerName && (
                        <Typography variant="body2">
                          <strong>Name:</strong> {session.customerName}
                        </Typography>
                      )}
                      {session.customerMobile && (
                        <Typography variant="body2">
                          <strong>Mobile:</strong> {session.customerMobile}
                        </Typography>
                      )}
                      {session.customerEmail && (
                        <Typography variant="body2">
                          <strong>Email:</strong> {session.customerEmail}
                        </Typography>
                      )}
                    </Box>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* Delete/Return Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth>
        <DialogTitle>Process Product Return</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Product: <strong>{itemToDelete?.productName}</strong>
          </Typography>
          <Typography gutterBottom>
            Original Quantity: <strong>{itemToDelete?.quantity}</strong>
          </Typography>
          <Typography gutterBottom>
            Unit Price: <strong>₹{itemToDelete?.pricePerUnit}</strong>
          </Typography>
          <Typography gutterBottom sx={{ mb: 2 }}>
            Total Amount: <strong>₹{itemToDelete?.total?.toFixed(2)}</strong>
          </Typography>

          {/* Return Quantity Input */}
          <TextField
            margin="dense"
            label="Return Quantity *"
            type="number"
            fullWidth
            value={returnQuantity}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              setReturnQuantity(
                Math.min(Math.max(1, value), itemToDelete?.quantity || 1)
              );
            }}
            inputProps={{
              min: 1,
              max: itemToDelete?.quantity || 1,
              step:
                itemToDelete?.unitType === "meter" ||
                itemToDelete?.unitType === "kilogram"
                  ? 0.1
                  : 1,
            }}
            helperText={`Maximum returnable: ${itemToDelete?.quantity || 0}`}
            sx={{ mb: 2 }}
          />

          {/* Return Amount Calculation */}
          <Typography
            variant="body2"
            color="primary"
            gutterBottom
            sx={{ mb: 2 }}>
            Return Amount:{" "}
            <strong>
              ₹
              {itemToDelete && returnQuantity
                ? (
                    (itemToDelete.total / itemToDelete.quantity) *
                    returnQuantity
                  ).toFixed(2)
                : "0.00"}
            </strong>
          </Typography>

          <TextField
            autoFocus
            margin="dense"
            label="Reason for Return *"
            fullWidth
            multiline
            rows={3}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="e.g., Defective product, Customer changed mind, Wrong item delivered..."
            required
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}>
            * This action will create a return record and update inventory.
            {returnQuantity < (itemToDelete?.quantity || 0) &&
              " A partial return will split this transaction."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteItem}
            variant="contained"
            color="error"
            disabled={
              !deleteReason.trim() || !returnQuantity || returnQuantity <= 0
            }>
            Process Return ({returnQuantity}{" "}
            {returnQuantity === 1 ? "item" : "items"})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
