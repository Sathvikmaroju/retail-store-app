import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    lowStockItems: [],
    recentTransactions: [],
    topSellingProducts: [],
    todaySales: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // all, today, week, month

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Parallel fetch for better performance
        const [transactionsData, productsData] = await Promise.all([
          fetchTransactionsData(),
          fetchProductsData()
        ]);

        setDashboardData({
          ...transactionsData,
          ...productsData
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeFilter]);

  const fetchTransactionsData = async () => {
    const transactionsSnapshot = await getDocs(
      query(collection(db, 'transactions'), orderBy('timestamp', 'desc'))
    );
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    // Calculate filtered data based on time filter
    const now = new Date();
    const filteredTransactions = transactions.filter(transaction => {
      if (!transaction.timestamp) return true;
      
      switch (timeFilter) {
        case 'today':
          return transaction.timestamp.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return transaction.timestamp >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return transaction.timestamp >= monthAgo;
        default:
          return true;
      }
    });

    // Calculate totals
    const totalSales = filteredTransactions.reduce((total, transaction) => {
      return total + (transaction.totalAmount || 0);
    }, 0);

    const todaySales = transactions
      .filter(t => t.timestamp && t.timestamp.toDateString() === now.toDateString())
      .reduce((total, t) => total + (t.totalAmount || 0), 0);

    // Get recent transactions (last 10)
    const recentTransactions = transactions.slice(0, 10);

    // Calculate top selling products
    const productSales = {};
    transactions.forEach(transaction => {
      if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach(item => {
          if (productSales[item.productId]) {
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.total;
          } else {
            productSales[item.productId] = {
              productName: item.productName,
              quantity: item.quantity,
              revenue: item.total
            };
          }
        });
      }
    });

    const topSellingProducts = Object.entries(productSales)
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalSales,
      totalTransactions: filteredTransactions.length,
      todaySales,
      recentTransactions,
      topSellingProducts
    };
  };

  const fetchProductsData = async () => {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Find low stock items (less than 10 units)
    const lowStockItems = products
      .filter(product => (product.remainingQty || 0) < 10)
      .sort((a, b) => (a.remainingQty || 0) - (b.remainingQty || 0))
      .slice(0, 10);

    return { lowStockItems };
  };

  // Memoized statistics cards
  const statsCards = useMemo(() => [
    {
      title: 'Total Sales',
      value: `$${dashboardData.totalSales.toFixed(2)}`,
      icon: '💰',
      color: 'green'
    },
    {
      title: 'Today\'s Sales',
      value: `$${dashboardData.todaySales.toFixed(2)}`,
      icon: '📈',
      color: 'blue'
    },
    {
      title: 'Total Transactions',
      value: dashboardData.totalTransactions,
      icon: '🧾',
      color: 'purple'
    },
    {
      title: 'Low Stock Items',
      value: dashboardData.lowStockItems.length,
      icon: '⚠️',
      color: 'orange'
    }
  ], [dashboardData]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="time-filter">
          <label>Time Period:</label>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Statistics Cards */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        {/* Low Stock Alert */}
        <div className="dashboard-section">
          <h3>🚨 Low Stock Alert</h3>
          {dashboardData.lowStockItems.length === 0 ? (
            <p className="no-data">All products are well stocked!</p>
          ) : (
            <div className="low-stock-grid">
              {dashboardData.lowStockItems.map(product => (
                <div key={product.id} className="low-stock-item">
                  <div className="product-info">
                    <strong>{product.name}</strong>
                    <span className="category">{product.category}</span>
                  </div>
                  <div className={`stock-level ${product.remainingQty === 0 ? 'out-of-stock' : 'low-stock'}`}>
                    {product.remainingQty || 0} left
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="dashboard-section">
          <h3>🏆 Top Selling Products</h3>
          {dashboardData.topSellingProducts.length === 0 ? (
            <p className="no-data">No sales data available.</p>
          ) : (
            <div className="top-products-list">
              {dashboardData.topSellingProducts.map((product, index) => (
                <div key={product.productId} className="top-product-item">
                  <div className="rank">#{index + 1}</div>
                  <div className="product-details">
                    <strong>{product.productName}</strong>
                    <div className="product-stats">
                      <span>Sold: {product.quantity} units</span>
                      <span>Revenue: ${product.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="dashboard-section">
          <h3>📋 Recent Transactions</h3>
          {dashboardData.recentTransactions.length === 0 ? (
            <p className="no-data">No recent transactions.</p>
          ) : (
            <div className="transactions-list">
              {dashboardData.recentTransactions.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-info">
                    <div className="transaction-amount">
                      ${transaction.totalAmount?.toFixed(2) || '0.00'}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-date">
                        {transaction.timestamp ? 
                          transaction.timestamp.toLocaleString() : 
                          'Date not available'
                        }
                      </div>
                      <div className="transaction-items">
                        {transaction.items?.length || 0} item(s)
                      </div>
                    </div>
                  </div>
                  <div className="transaction-status">
                    <span className={`status ${transaction.status || 'completed'}`}>
                      {transaction.status || 'Completed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;