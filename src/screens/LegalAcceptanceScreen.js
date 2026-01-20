import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { acceptLegalTerms } from '../redux/authSlice';

const LegalContent = {
  terms_of_service: {
    title: 'Terms of Service',
    content: `Platform Role:
TechnicianMarketPlace connects customers with independent technicians. We are a platform facilitating transactions and do not employ any technician.

Cancellation Policy:
Customers can cancel bookings with full refund up to 4 hours after booking. Cancellations after 4 hours but before service will incur a 20% cancellation fee (80% refund). Cancellations during service or no-shows will result in no refund.

Material Requirements:
Customers must provide basic materials such as water, electricity access, and a safe working environment. Technicians provide specialized tools and materials.

Payment Terms:
Full refund available within 4 hours of booking. Partial refunds (80%) available until 1 hour before scheduled service. No refunds for cancellations during service or after completion.

User Conduct:
Users must provide accurate information and conduct themselves professionally. Prohibited: harassment, violence, discrimination, illegal activities.

Limitation of Liability:
TechnicianMarketPlace shall not be liable for indirect, consequential, or punitive damages exceeding the service amount paid.`,
  },
  warranty_policy: {
    title: 'Warranty Policy',
    content: `7-Day Warranty:
All services include a 7-day warranty period from completion date.

Coverage:
- Service not completed as described
- Defective workmanship
- Immediate failure within 7 days
- Damage caused directly by technician
- Missing work or promised features

Exclusions:
- Normal wear and tear
- Misuse or negligence by customer
- Customer-caused damage post-service
- External factors beyond technician control
- Services involving consumable materials (unless defective)

Claim Process:
1. Contact us within 7 days of service completion
2. Provide documentation/photos of issue
3. Technician will review and respond within 24 hours
4. Remedies: Re-work, partial refund, or full refund

All warranty claims must be filed within 7 days. No claims accepted after this period.`,
  },
  cancellation_policy: {
    title: 'Cancellation Policy',
    content: `Full Refund Window: 0-4 hours after booking
- 100% refund to original payment method
- No charges applied
- Refund processed automatically

Partial Refund Window: 4 hours to 1 hour before service
- 80% refund to customer
- 20% cancellation fee (split 50/50 between technician & platform)
- Technician retains 10% of service charge
- Platform retains 10% processing fee

No Refund: Less than 1 hour before service or during service
- 100% service charge retained
- Customer cannot cancel without technician approval
- No-show results in full charge with possible account suspension

Technician Cancellation:
- If cancelled by technician: 100% customer refund (outside all windows)
- If technician no-shows: Customer gets 100% refund + account credit

Rescheduling:
Treated as cancellation + new booking. Refund policy resets with new booking time.

Special Cases:
- Emergency situations: 100% refund with documentation
- Force majeure events: Case-by-case evaluation by support team`,
  },
  privacy_policy: {
    title: 'Privacy Policy',
    content: `Data Collection:
We collect name, email, phone, payment information, service history, and location data for service delivery.

Data Usage:
- Service delivery and customer support
- Platform improvement and analytics
- Marketing communications (with consent)
- Fraud prevention and security

Data Sharing:
- With technicians: Only information relevant to service
- With payment processors: Payment information only
- Legal authorities: When required by law
- Third-party partners: Only with explicit consent

Data Retention:
- Active account data: Retained during account lifetime
- Service history: Retained for 2 years for disputes
- Payment info: Retained per RBI guidelines
- Deleted account data: Purged within 90 days

GDPR & CCPA Compliance:
Users have rights to access, rectify, and delete their data. Submit requests to support@technicianmarketplace.com

Cookies & Tracking:
We use analytics to understand usage patterns. You can disable tracking in settings.

Contact:
For privacy concerns, contact: privacy@technicianmarketplace.com`,
  },
  platform_disclaimer: {
    title: 'Platform Disclaimer',
    content: `Independent Contractor:
All technicians are independent contractors, not employees. TechnicianMarketPlace is not responsible for their actions or work quality beyond warranty terms.

Service Quality:
We do not guarantee service quality or completion time. Customer satisfaction depends on communication and expectations set with technician.

No Liability For:
- Third-party services or recommendations
- Network interruptions or technical failures
- Indirect or consequential damages
- Lost profits or data

Platform Availability:
Services provided "as is" without warranty of uninterrupted availability. We may perform maintenance causing temporary unavailability.

Prohibited Activities:
Users must not engage in harassment, violence, fraud, IP theft, or illegal activities. Violations result in account suspension and legal action.

Dispute Resolution:
Disputes will be resolved through negotiation. Unresolved disputes subject to arbitration under applicable law.

Modification Rights:
We reserve the right to modify these terms with 30 days notice. Continued use constitutes acceptance.

Governing Law:
These terms governed by local jurisdiction laws where services are provided.`,
  },
};

const CheckBox = ({ isChecked, onPress, label }) => (
  <TouchableOpacity
    style={[styles.checkboxContainer, isChecked && styles.checkboxChecked]}
    onPress={onPress}
  >
    <View style={styles.checkbox}>
      {isChecked && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

export const LegalAcceptanceScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);

  const [activeTab, setActiveTab] = useState('terms_of_service');
  const [acceptedTerms, setAcceptedTerms] = useState({
    terms_of_service: false,
    warranty_policy: false,
    cancellation_policy: false,
    privacy_policy: false,
    platform_disclaimer: false,
  });

  const toggleAcceptance = (term) => {
    setAcceptedTerms((prev) => ({
      ...prev,
      [term]: !prev[term],
    }));
  };

  const allTermsAccepted = Object.values(acceptedTerms).every((accepted) => accepted);

  const handleAcceptAll = async () => {
    if (!allTermsAccepted) {
      Alert.alert('Required', 'Please accept all terms and conditions to proceed');
      return;
    }

    try {
      await dispatch(acceptLegalTerms({ userId: user.id })).unwrap();
      Alert.alert('Success', 'Legal terms accepted! Welcome to TechnicianMarketPlace.');
    } catch (error) {
      Alert.alert('Error', error || 'Failed to accept terms. Please try again.');
    }
  };

  const currentContent = LegalContent[activeTab];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Legal Agreements</Text>
        <Text style={styles.headerSubtitle}>Please review and accept all terms to continue</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal style={styles.tabsContainer} showsHorizontalScrollIndicator={false}>
        {Object.entries(LegalContent).map(([key, { title }]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.tab,
              activeTab === key && styles.tabActive,
            ]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[
              styles.tabText,
              activeTab === key && styles.tabTextActive,
            ]}>
              {title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={true}>
        <Text style={styles.contentTitle}>{currentContent.title}</Text>
        <Text style={styles.contentText}>{currentContent.content}</Text>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Acceptance Checkboxes */}
      <View style={styles.checkboxesContainer}>
        <Text style={styles.checkboxesTitle}>Accept Terms:</Text>
        {Object.entries(LegalContent).map(([key, { title }]) => (
          <CheckBox
            key={key}
            isChecked={acceptedTerms[key]}
            onPress={() => toggleAcceptance(key)}
            label={title}
          />
        ))}
      </View>

      {/* Accept Button */}
      <TouchableOpacity
        style={[
          styles.acceptButton,
          !allTermsAccepted && styles.acceptButtonDisabled,
        ]}
        onPress={handleAcceptAll}
        disabled={!allTermsAccepted || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.acceptButtonText}>Accept All & Continue</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  tabsContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 0,
    maxHeight: 42,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 9,
    marginHorizontal: 2,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    height: 42,
  },
  tabActive: {
    borderBottomColor: '#1E90FF',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#1E90FF',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E90FF',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    marginBottom: 16,
  },
  spacer: {
    height: 12,
  },
  checkboxesContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  checkboxesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F9F9F9',
  },
  checkboxChecked: {
    backgroundColor: '#E8F5E9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#1E90FF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFF',
  },
  checkmark: {
    color: '#1E90FF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  acceptButton: {
    backgroundColor: '#1E90FF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
