import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface UserInfoModalProps {
  visible: boolean;
  onClose: () => void;
  userDetails: any;
}

const UserInfoModal: React.FC<UserInfoModalProps> = ({
  visible,
  onClose,
  userDetails,
}) => {
  const renderUserInfoContent = () => {
    if (!userDetails) return null;

    const {type, data, userId} = userDetails;

    // Field Employee - check employee_type or if zone/region/area exists
    if (type === 'employee' && (data.employee_type === 'field' || data.zone || data.region || data.area)) {
      return (
        <View style={styles.infoCard}>
          {data.zone && (
            <View style={styles.cardRow}>
              <Text style={styles.label}>Zone:</Text>
              <Text style={styles.value}>{data.zone}</Text>
            </View>
          )}
          {data.region && (
            <View style={styles.cardRow}>
              <Text style={styles.label}>Region:</Text>
              <Text style={styles.value}>{data.region}</Text>
            </View>
          )}
          {data.area && (
            <View style={styles.cardRow}>
              <Text style={styles.label}>Area:</Text>
              <Text style={styles.value}>{data.area}</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Employee ID:</Text>
            <Text style={styles.value}>{data.employee_id || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Designation:</Text>
            <Text style={styles.value}>{data.designation || data.role}</Text>
          </View>
        </View>
      );
    }

    // Facility Employee
    if (type === 'employee' && data.facility_id) {
      return (
        <View style={styles.infoCard}>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Facility:</Text>
            <Text style={styles.value}>
              {data.facility_id?.name || 'N/A'}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Employee ID:</Text>
            <Text style={styles.value}>{data.employee_id || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Designation:</Text>
            <Text style={styles.value}>{data.designation || data.role}</Text>
          </View>
        </View>
      );
    }

    // Other Employees
    if (type === 'employee') {
      return (
        <View style={styles.infoCard}>
          <View style={styles.cardRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Employee ID:</Text>
            <Text style={styles.value}>{data.employee_id || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Designation:</Text>
            <Text style={styles.value}>{data.designation || data.role}</Text>
          </View>
        </View>
      );
    }

    // Distributor
    if (type === 'distributor') {
      return (
        <View style={styles.infoCard}>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Distributor Name:</Text>
            <Text style={styles.value}>{data.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Territory:</Text>
            <Text style={styles.value}>{data.territory_name || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Designation:</Text>
            <Text style={styles.value}>Distributor</Text>
          </View>
        </View>
      );
    }

    // DSR
    if (type === 'dsr') {
      return (
        <View style={styles.infoCard}>
          <View style={styles.cardRow}>
            <Text style={styles.label}>DSR Name:</Text>
            <Text style={styles.value}>{data.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Distributor:</Text>
            <Text style={styles.value}>
              {data.distributor_id?.name || 'N/A'}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Territory:</Text>
            <Text style={styles.value}>{data.territory_name || 'N/A'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Designation:</Text>
            <Text style={styles.value}>DSR</Text>
          </View>
        </View>
      );
    }

    // Basic user (superadmin, etc.)
    if (type === 'basic') {
      return (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoTextLeft}>
              {data.full_name || data.username || 'N/A'}
            </Text>
            <Text style={styles.infoTextRight}>
              {data.role?.role || 'System Administrator'}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>My Information</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.scrollContent}>
                {renderUserInfoContent()}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  scrollContent: {
    maxHeight: 500,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTextLeft: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  infoTextRight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default UserInfoModal;
