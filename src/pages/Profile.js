import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
} from "@mui/material";
import {
  EmailAuthProvider,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function Profile() {
  const user = auth.currentUser;

  const [email, setEmail] = useState(user?.email || "");
  const [currentPwdForEmail, setCurrentPwdForEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const [currentPwdForPwd, setCurrentPwdForPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  const [successMsg, setSuccessMsg] = useState("");

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const validatePassword = (val) => val.length >= 6;

  const reauthenticate = async (password) => {
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, cred);
  };

  const handleEmailUpdate = async () => {
    setEmailError("");
    setSuccessMsg("");

    if (!validateEmail(email)) {
      setEmailError("Invalid email format");
      return;
    }

    if (!validatePassword(currentPwdForEmail)) {
      setEmailError("Enter your current password (min 6 chars)");
      return;
    }

    try {
      await reauthenticate(currentPwdForEmail);
      await updateEmail(user, email);
      setSuccessMsg("Email updated successfully!");
      setCurrentPwdForEmail("");
    } catch (err) {
      setEmailError(err.message);
    }
  };

  const handlePasswordUpdate = async () => {
    setPwdError("");
    setSuccessMsg("");

    if (!validatePassword(currentPwdForPwd)) {
      return setPwdError("Enter your current password (min 6 chars)");
    }

    if (!validatePassword(newPwd)) {
      return setPwdError("New password must be at least 6 characters");
    }

    if (newPwd !== confirmPwd) {
      return setPwdError("Passwords do not match");
    }

    try {
      await reauthenticate(currentPwdForPwd);
      await updatePassword(user, newPwd);
      setSuccessMsg("Password updated successfully!");
      setCurrentPwdForPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      setPwdError(err.message);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Email Update */}
      <Card sx={{ maxWidth: 500, mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Update Email
          </Typography>
          <TextField
            label="New Email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!emailError}
          />
          <TextField
            label="Current Password"
            type="password"
            fullWidth
            margin="normal"
            value={currentPwdForEmail}
            onChange={(e) => setCurrentPwdForEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError}
          />
          <Button variant="contained" onClick={handleEmailUpdate}>
            Update Email
          </Button>
        </CardContent>
      </Card>

      {/* Password Update */}
      <Card sx={{ maxWidth: 500 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Update Password
          </Typography>

          <TextField
            label="Current Password"
            type="password"
            fullWidth
            margin="normal"
            value={currentPwdForPwd}
            onChange={(e) => setCurrentPwdForPwd(e.target.value)}
          />

          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
          />

          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            error={!!pwdError}
            helperText={pwdError}
          />

          <Button variant="contained" onClick={handlePasswordUpdate}>
            Update Password
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
