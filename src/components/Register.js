import React, { useState } from "react";
import {
  Avatar,
  Button,
  TextField,
  Box,
  Typography,
  Container,
  Paper,
  MenuItem,
  Alert,
  Grid,
} from "@mui/material";
import { PersonAdd } from "@mui/icons-material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "staff",
    countryCode: "+91",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\d{10,15}$/;

    if (!form.email || !emailPattern.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!form.password || form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!form.role) {
      newErrors.role = "Please select a role";
    }

    if (!form.phone || !phonePattern.test(form.phone)) {
      newErrors.phone = "Enter valid phone number (10–15 digits)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: form.email,
        role: form.role,
        phone: `${form.countryCode}${form.phone}`,
      });
      navigate("/login");
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main", mb: 1 }}>
            <PersonAdd />
          </Avatar>
          <Typography component="h1" variant="h5" mb={2}>
            Register User
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              label="Email"
              name="email"
              fullWidth
              margin="normal"
              value={form.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
            />

            <TextField
              label="Password"
              name="password"
              type="password"
              fullWidth
              margin="normal"
              value={form.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
            />

            {/* Country code + phone number */}
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  select
                  label="Code"
                  name="countryCode"
                  fullWidth
                  value={form.countryCode}
                  onChange={handleChange}>
                  <MenuItem value="+91">+91 (IN)</MenuItem>
                  <MenuItem value="+1">+1 (US)</MenuItem>
                  <MenuItem value="+44">+44 (UK)</MenuItem>
                  <MenuItem value="+61">+61 (AU)</MenuItem>
                  <MenuItem value="+971">+971 (UAE)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={8}>
                <TextField
                  label="Phone Number"
                  name="phone"
                  fullWidth
                  value={form.phone}
                  onChange={handleChange}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  error={!!errors.phone}
                  helperText={errors.phone}
                />
              </Grid>
            </Grid>

            <TextField
              select
              label="Role"
              name="role"
              fullWidth
              margin="normal"
              value={form.role}
              onChange={handleChange}
              error={!!errors.role}
              helperText={errors.role}>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
              Register
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
