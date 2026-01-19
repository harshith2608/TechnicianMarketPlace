import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchTechnicianEarnings,
    selectEarnings,
    selectPaymentLoading,
} from '../redux/paymentSlice';
import { formatCurrency, PAYMENT_CONFIG } from '../utils/paymentConfig';

/**
 * EarningsScreen - Technician earnings dashboard
 * Shows total earnings, pending payout, and earning history
 */
const EarningsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState(null);

  const earnings = useSelector(selectEarnings);
  const loading = useSelector(selectPaymentLoading);

  useEffect(() => {
    loadEarnings();
  }, []);

  /**
   * Load earnings data
   */
  const loadEarnings = async () => {
    try {
      const result = await dispatch(fetchTechnicianEarnings()).unwrap();
      setEarningsData(result);
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEarnings();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Format period label (daily, weekly, monthly)
   */
  const getPeriodLabel = (period) => {
    switch (period) {
      case 'daily':
        return 'Today';
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      default:
        return period;
    }
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>No Earnings Yet</Text>
      <Text style={styles.emptyText}>
        Complete services to start earning. Your commission will appear here.
      </Text>
    </View>
  );

  /**
   * Render earning period card
   */
  const renderEarningsPeriod = ({ item }) => (
    <View style={styles.periodCard}>
      <Text style={styles.periodLabel}>{getPeriodLabel(item.period)}</Text>
      <Text style={styles.periodAmount}>{formatCurrency(item.amount)}</Text>
      <View style={styles.periodDetail}>
        <Text style={styles.periodDetailText}>{item.count} transactions</Text>
        <Text style={styles.periodDetailText}>Avg: {formatCurrency(item.average)}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Earnings</Text>
        <Text style={styles.subtitle}>Track your commission and payouts</Text>
      </View>

      {/* Total Earnings Card */}
      {earningsData && (
        <View style={styles.totalCard}>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Earnings</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(earningsData.totalEarnings || 0)}
            </Text>
            <Text style={styles.totalDetail}>
              {earningsData.totalTransactions || 0} transactions
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Pending Payout</Text>
            <Text style={styles.pendingAmount}>
              {formatCurrency(earningsData.pendingPayout || 0)}
            </Text>
            <Text style={styles.totalDetail}>
              Minimum ₹{PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD} to request
            </Text>
          </View>
        </View>
      )}

      {/* Quick Stats */}
      {earningsData && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statLabel}>Average Commission</Text>
            <Text style={styles.statValue}>
              {formatCurrency(earningsData.averageCommission || 0)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statLabel}>Highest Payout</Text>
            <Text style={styles.statValue}>
              {formatCurrency(earningsData.highestPayout || 0)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏰</Text>
            <Text style={styles.statLabel}>Last Payout</Text>
            <Text style={styles.statValue}>
              {earningsData.lastPayoutDate
                ? new Date(earningsData.lastPayoutDate).toLocaleDateString('en-IN')
                : 'Never'}
            </Text>
          </View>
        </View>
      )}

      {/* Payout Status */}
      {earningsData && (
        <View style={styles.payoutStatusCard}>
          <Text style={styles.payoutTitle}>Payout Status</Text>

          <View style={styles.payoutProgress}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(
                    (earningsData.pendingPayout / PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD) * 100,
                    100
                  )}%`,
                },
              ]}
            />
          </View>

          <View style={styles.payoutInfo}>
            <Text style={styles.payoutText}>
              ₹{earningsData.pendingPayout || 0} of ₹{PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD}
            </Text>
            {earningsData.pendingPayout >= PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD ? (
              <Text style={styles.payoutReady}>✓ Ready for payout</Text>
            ) : (
              <Text style={styles.payoutRemaining}>
                ₹{PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD - (earningsData.pendingPayout || 0)} more
              </Text>
            )}
          </View>

          {earningsData.pendingPayout >= PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD && (
            <TouchableOpacity
              style={styles.payoutButton}
              onPress={() => navigation.navigate('PayoutSettings')}
            >
              <Text style={styles.payoutButtonText}>Request Payout →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Earnings Breakdown */}
      {earningsData && earningsData.periods && earningsData.periods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
          <FlatList
            data={earningsData.periods}
            renderItem={renderEarningsPeriod}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}

      {/* Commission Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How Commission Works</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            You earn {PAYMENT_CONFIG.COMMISSION_RATE * 100}% of each service amount as commission
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            Commission is capped at ₹{PAYMENT_CONFIG.COMMISSION_CAP} per transaction
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            Payouts are processed {PAYMENT_CONFIG.PAYOUT_FREQUENCY}ly to your bank account
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            Minimum payout threshold is ₹{PAYMENT_CONFIG.MIN_PAYOUT_THRESHOLD}
          </Text>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <Text style={styles.navButtonText}>📜 Payment History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('PayoutSettings')}
        >
          <Text style={styles.navButtonText}>⚙️ Payout Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {(!earningsData || earningsData.totalEarnings === 0) && !loading && renderEmptyState()}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Loading your earnings...</Text>
        </View>
      )}

      <View style={styles.spacing} />
    </ScrollView>
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
  totalCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  totalSection: {
    flex: 1,
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  totalDetail: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
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
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
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
    textAlign: 'center',
  },
  payoutStatusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  payoutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  payoutProgress: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 4,
  },
  payoutInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutText: {
    fontSize: 13,
    color: '#666',
  },
  payoutReady: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  payoutRemaining: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  payoutButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  periodCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  periodAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  periodDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodDetailText: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    height: 8,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#388E3C',
    flex: 1,
    lineHeight: 18,
  },
  navigationButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 8,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#6200EE',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
  spacing: {
    height: 20,
  },
});

export default EarningsScreen;
