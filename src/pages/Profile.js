import React, { useState, useEffect } from 'react';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/firebase';

function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState({
    email: false,
    password: false
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setFormData(prev => ({ ...prev, email: currentUser.email || '' }));
    }
  }, []);

  const clearMessages = () => {
    setErrors({});
    setSuccessMessage('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const reauthenticateUser = async (currentPassword) => {
    if (!user || !currentPassword) {
      throw new Error('Current password is required for sensitive operations');
    }
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    clearMessages();

    // Validation
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required to update email';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (formData.email === user?.email) {
      setErrors({ email: 'New email must be different from current email' });
      return;
    }

    setLoading(prev => ({ ...prev, email: true }));

    try {
      // Reauthenticate before updating email
      await reauthenticateUser(formData.currentPassword);
      await updateEmail(user, formData.email);
      
      setSuccessMessage('Email updated successfully!');
      setFormData(prev => ({ ...prev, currentPassword: '' }));
    } catch (error) {
      console.error('Error updating email:', error);
      const errorMessage = getFirebaseErrorMessage(error);
      setErrors({ general: errorMessage });
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    clearMessages();

    // Validation
    const newErrors = {};
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!validatePassword(formData.newPassword)) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));

    try {
      // Reauthenticate before updating password
      await reauthenticateUser(formData.currentPassword);
      await updatePassword(user, formData.newPassword);
      
      setSuccessMessage('Password updated successfully!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMessage = getFirebaseErrorMessage(error);
      setErrors({ general: errorMessage });
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/wrong-password':
        return 'Current password is incorrect';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/email-already-in-use':
        return 'This email is already in use by another account';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/requires-recent-login':
        return 'Please log out and log back in before making this change';
      default:
        return error.message || 'An unexpected error occurred';
    }
  };

  if (!user) {
    return <div>Loading user information...</div>;
  }

  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      
      <div className="profile-info">
        <p><strong>Current Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role || 'User'}</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message" role="alert">
          {successMessage}
        </div>
      )}

      {/* General Error Message */}
      {errors.general && (
        <div className="error-message" role="alert">
          {errors.general}
        </div>
      )}

      {/* Update Email Form */}
      <form onSubmit={handleUpdateEmail} className="profile-form">
        <h3>Update Email</h3>
        
        <div className="form-group">
          <label htmlFor="email">New Email:</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'error' : ''}
            disabled={loading.email}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="currentPasswordEmail">Current Password:</label>
          <input
            id="currentPasswordEmail"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleInputChange}
            className={errors.currentPassword ? 'error' : ''}
            disabled={loading.email}
          />
          {errors.currentPassword && <span className="error-text">{errors.currentPassword}</span>}
        </div>

        <button 
          type="submit" 
          disabled={loading.email}
          className="update-btn"
        >
          {loading.email ? 'Updating...' : 'Update Email'}
        </button>
      </form>

      {/* Update Password Form */}
      <form onSubmit={handleUpdatePassword} className="profile-form">
        <h3>Update Password</h3>
        
        <div className="form-group">
          <label htmlFor="currentPasswordPass">Current Password:</label>
          <input
            id="currentPasswordPass"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleInputChange}
            className={errors.currentPassword ? 'error' : ''}
            disabled={loading.password}
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">New Password:</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleInputChange}
            className={errors.newPassword ? 'error' : ''}
            disabled={loading.password}
            minLength="6"
          />
          {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password:</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={errors.confirmPassword ? 'error' : ''}
            disabled={loading.password}
            minLength="6"
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>

        <button 
          type="submit" 
          disabled={loading.password}
          className="update-btn"
        >
          {loading.password ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

export default Profile;