import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

function Dashboard() {
  const [totalSales, setTotalSales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch transactions
      const transactionsSnap = await getDocs(collection(db, "transactions"));
      let sales = 0;
      const transactions = transactionsSnap.docs.map((doc) => {
        const data = doc.data();
        sales += data.total || 0;
        return { id: doc.id, ...data };
      });

      // Fetch products
      const productsSnap = await getDocs(collection(db, "products"));
      const lowStock = productsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p) => (p.remainingQty || 0) < 5);

      setTotalSales(sales);
      setLowStockItems(lowStock);
      setRecentTransactions(transactions.slice(-5).reverse());
    };

    fetchData();
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Total Sales Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Total Sales
              </Typography>
              <Typography variant="h4" color="primary">
                ₹{totalSales.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Items */}
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Low Stock Items
              </Typography>
              {lowStockItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  All good!
                </Typography>
              ) : (
                <List dense>
                  {lowStockItems.map((item) => (
                    <ListItem key={item.id}>
                      <ListItemText
                        primary={item.name}
                        secondary={`Remaining: ${item.remainingQty}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Recent Transactions
              </Typography>
              <List dense>
                {recentTransactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <ListItem>
                      <ListItemText
                        primary={`₹${tx.total?.toFixed(2) || 0}`}
                        secondary={
                          tx.timestamp
                            ? new Date(tx.timestamp.toDate()).toLocaleString()
                            : "Unknown time"
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
