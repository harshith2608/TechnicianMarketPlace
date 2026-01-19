import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchPaymentHistory,
    selectPaymentHistory,
    selectPaymentLoading,
} from '../redux/paymentSlice';
import { formatCurrency } from '../utils/paymentConfig';

/**
 * PaymentHistoryScreen - View transaction history
 */
const PaymentHistoryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, successful, refunded, pending
  const [searchText, setSearchText] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);

  const paymentHistory = useSelector(selectPaymentHistory);
  const loading = useSelector(selectPaymentLoading);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  // Filter history when search or filter changes
  useEffect(() => {
    if (paymentHistory) {
      let filtered = paymentHistory;

      // Apply type filter
      if (filterType !== 'all') {
        filtered = filtered.filter((item) => item.status === filterType);
      }

      // Apply search filter
      if (searchText) {
        filtered = filtered.filter((item) =>
          item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.transactionId?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.technicianName?.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      setFilteredHistory(filtered);
    }
  }, [paymentHistory, filterType, searchText]);

  /**
   * Load payment history
   */
  const loadPaymentHistory = async () => {
    try {
      await dispatch(fetchPaymentHistory()).unwrap();
    } catch (err) {
      console.error('Failed to load payment history:', err);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPaymentHistory();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'refunded':
        return '#2196F3';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#666';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'refunded':
        return '↩';
      case 'pending':
        return '⏳';
      case 'failed':
        return '✕';
      default:
        return '•';
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-IN');
  };

  /**
   * Render transaction item
   */
  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => {
        navigation.navigate('PaymentDetails', { payment: item });
      }}
    >
      <View style={styles.transactionLeft}>
        <View style={styles.iconContainer}>
          <Text style={styles.typeIcon}>💳</Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>{item.description}</Text>
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            {item.technicianName && (
              <Text style={styles.metaText}> • {item.technicianName}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.transactionRight}>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptyText}>
        {filterType !== 'all' || searchText
          ? 'No transactions match your search'
          : 'Complete services to start seeing transactions here'}
      </Text>
    </View>
  );

  /**
   * Render filter buttons
   */
  const renderFilterButtons = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {[
        { key: 'all', label: 'All', icon: '📊' },
        { key: 'completed', label: 'Completed', icon: '✓' },
        { key: 'refunded', label: 'Refunded', icon: '↩' },
        { key: 'pending', label: 'Pending', icon: '⏳' },
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            filterType === filter.key && styles.filterButtonActive,
          ]}
          onPress={() => setFilterType(filter.key)}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterType === filter.key && styles.filterButtonTextActive,
            ]}
          >
            {filter.icon} {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  /**
   * Calculate summary stats
   */
  const getSummaryStats = () => {
    const completed = paymentHistory?.filter((p) => p.status === 'completed') || [];
    const refunded = paymentHistory?.filter((p) => p.status === 'refunded') || [];

    return {
      totalTransactions: paymentHistory?.length || 0,
      totalPaid: completed.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalRefunded: refunded.reduce((sum, p) => sum + (p.refundAmount || 0), 0),
    };
  };

  const stats = getSummaryStats();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Payment History</Text>
        <Text style={styles.subtitle}>Track all your transactions</Text>
      </View>

      {/* Stats */}
      {stats.totalTransactions > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Transactions</Text>
            <Text style={styles.statValue}>{stats.totalTransactions}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Paid</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {formatCurrency(stats.totalPaid)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Refunded</Text>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>
              {formatCurrency(stats.totalRefunded)}
            </Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Transactions List */}
      <FlatList
        data={filteredHistory}
        renderItem={renderTransactionItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

      {/* Loading State */}
      {loading && filteredHistory.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6200EE',
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  clearIcon: {
    fontSize: 18,
    color: '#999',
    marginLeft: 8,
  },
  filterContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  filterContent: {
    paddingRight: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    color: '#fff',
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
});

export default PaymentHistoryScreen;
