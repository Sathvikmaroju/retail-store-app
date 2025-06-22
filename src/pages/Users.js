import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  // Fetch users function
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrors({ general: 'Failed to load users. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const clearMessages = () => {
    setErrors({});
    setSuccessMessage('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEditClick = (userId, email, role) => {
    clearMessages();
    setEditingUserId(userId);
    setFormData({
      email: email || '',
      role: role || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setFormData({ email: '', role: '' });
    clearMessages();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleUpdateUser = async () => {
    clearMessages();

    // Validation
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Check for duplicate email (excluding current user)
    const existingUser = users.find(user => 
      user.email.toLowerCase() === formData.email.toLowerCase() && 
      user.id !== editingUserId
    );
    if (existingUser) {
      newErrors.email = 'This email is already in use by another user';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const userRef = doc(db, 'users', editingUserId);
      await updateDoc(userRef, {
        email: formData.email.trim(),
        role: formData.role
      });

      setSuccessMessage('User updated successfully!');
      setEditingUserId(null);
      setFormData({ email: '', role: '' });
      
      // Refresh the user list
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setErrors({ general: 'Failed to update user. Please try again.' });
    }
  };

  const handleDeleteClick = (userId, userEmail) => {
    setDeleteConfirm({ userId, userEmail });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const userRef = doc(db, 'users', deleteConfirm.userId);
      await deleteDoc(userRef);
      
      setSuccessMessage('User deleted successfully!');
      setDeleteConfirm(null);
      
      // Refresh the user list
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrors({ general: 'Failed to delete user. Please try again.' });
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h2>User Management</h2>
        <button 
          onClick={() => navigate('/register')}
          className="create-user-btn"
        >
          Create New User
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message" role="alert">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errors.general && (
        <div className="error-message" role="alert">
          {errors.general}
        </div>
      )}

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="no-users">
          <p>No users found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    {editingUserId === user.id ? (
                      <div className="edit-field">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={errors.email ? 'error' : ''}
                          placeholder="Enter email"
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                      </div>
                    ) : (
                      <span className="user-email">{user.email}</span>
                    )}
                  </td>
                  <td>
                    {editingUserId === user.id ? (
                      <div className="edit-field">
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          className={errors.role ? 'error' : ''}
                        >
                          <option value="">Select Role</option>
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                        {errors.role && <span className="error-text">{errors.role}</span>}
                      </div>
                    ) : (
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingUserId === user.id ? (
                        <>
                          <button 
                            onClick={handleUpdateUser}
                            className="save-btn"
                          >
                            Save
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="cancel-btn"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEditClick(user.id, user.email, user.role)}
                            className="edit-btn"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(user.id, user.email)}
                            className="delete-btn"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete the user:</p>
            <p className="delete-email"><strong>{deleteConfirm.userEmail}</strong></p>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                onClick={handleConfirmDelete}
                className="confirm-delete-btn"
              >
                Delete User
              </button>
              <button 
                onClick={handleCancelDelete}
                className="cancel-delete-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;