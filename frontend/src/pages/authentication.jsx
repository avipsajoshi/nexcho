import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/AuthContext";
import { Snackbar } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Link, useNavigate } from "react-router-dom";

const defaultTheme = createTheme();

// Validation regexes
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
// Password: min 8 chars, at least one uppercase, one lowercase, one digit, one special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
// Username: letters, numbers, underscore, 3-20 chars
const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
// Name: letters, spaces, hyphens, min 2
const NAME_REGEX = /^[A-Za-z\-\s']{2,100}$/;

export default function Authentication() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [globalError, setGlobalError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [formState, setFormState] = React.useState(0); // 0 = login, 1 = register
  const [open, setOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [fieldErrors, setFieldErrors] = React.useState({});

  const { handleRegister, handleLogin } = React.useContext(AuthContext);
  const navigate = useNavigate();

  const handleResetFields = () => {
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setFieldErrors({});
    setGlobalError("");
  };

  const validate = () => {
    const errors = {};

    if (formState === 1) {
      // Register-specific validations
      if (!name.trim()) errors.name = "Full name is required.";
      else if (!NAME_REGEX.test(name.trim()))
        errors.name = "Name must be at least 2 characters and only contain letters, spaces or hyphens.";

      if (!email.trim()) errors.email = "Email is required.";
      else if (!EMAIL_REGEX.test(email.trim())) errors.email = "Enter a valid email address.";
    }

    // Username validation
    if (!username.trim()) errors.username = "Username is required.";
    else if (!USERNAME_REGEX.test(username.trim()))
      errors.username = "Username must be 3–20 characters long and can contain letters, numbers and underscores.";

    // Password validation
    if (!password) errors.password = "Password is required.";
    else if (!PASSWORD_REGEX.test(password))
      errors.password = "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character.";

    return errors;
  };

  const handleAuth = async () => {
    setGlobalError("");
    setMessage("");
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus the first error field (best-effort)
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(firstKey);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      if (formState === 0) {
        // Login
        let result = await handleLogin(username.trim(), password);
        if (result && result.success) {
          setMessage("Login successful!");
          setOpen(true);
          navigate("/home");
        } else {
          setGlobalError(result?.message || "Login failed");
        }
      }

      if (formState === 1) {
        // Register
        let result = await handleRegister(name.trim(), username.trim(), email.trim(), password);
        // Expecting result to be { success: true } or a message - adapt as needed
        if (result && result.success) {
          setMessage("Registration successful!");
          setOpen(true);
          handleResetFields();
          navigate("/home");
        } else if (typeof result === "string") {
          setMessage(result);
          setOpen(true);
        } else {
          setGlobalError(result?.message || "Registration failed");
        }
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || "Something went wrong";
      setGlobalError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 px-4">
        {/* Card */}
        <div className="w-full max-w-lg bg-transparent rounded-xl shadow-lg overflow-hidden grid grid-cols-1">
          {/* Right: form */}
          <div className="bg-white p-8 md:p-10 flex flex-col justify-center">
            <div className="mx-auto w-full max-w-md">
              {/* Top avatar & title */}
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="bg-indigo-600">
                  <LockOutlinedIcon style={{ color: "white" }} />
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{formState === 0 ? 'Welcome back' : 'Create account'}</h2>
                  <p className="text-sm text-gray-500">
                    {formState === 0 ? "Sign in to your account" : "Create a new account"}
                  </p>
                </div>
              </div>

              {/* Toggle Sign In / Sign Up */}
              <div className="inline-flex rounded-lg bg-gray-100 p-1 mb-6">
                <button
                  onClick={() => {
                    setFormState(0);
                    handleResetFields();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    formState === 0
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Sign In
                </button>

                <button
                  onClick={() => {
                    setFormState(1);
                    handleResetFields();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    formState === 1
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error text */}
              <div className="min-h-[1.5rem] mb-2">
                {globalError ? <p className="text-sm text-red-600">{globalError}</p> : <span />}
              </div>

              {/* Form */}
              <Box component="form" noValidate sx={{ mt: 0 }}>
                {formState === 1 && (
                  <>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="name"
                      label="Full Name"
                      name="name"
                      value={name}
                      autoFocus
                      onChange={(e) => setName(e.target.value)}
                      error={!!fieldErrors.name}
                      helperText={fieldErrors.name}
                    />
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={!!fieldErrors.email}
                      helperText={fieldErrors.email}
                    />
                  </>
                )}

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  value={username}
                  autoFocus={formState === 0}
                  onChange={(e) => setUsername(e.target.value)}
                  error={!!fieldErrors.username}
                  helperText={fieldErrors.username}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  value={password}
                  type={showPassword ? "text" : "password"}
                  onChange={(e) => setPassword(e.target.value)}
                  id="password"
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password || (formState === 1 ? "Must be at least 8 chars and include uppercase, lowercase, number and special char." : "")}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword((show) => !show)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Primary action */}
                <div className="mt-6">
                  <Button
                    type="button"
                    fullWidth
                    variant="contained"
                    onClick={handleAuth}
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2"
                  >
                    {isSubmitting ? (formState === 0 ? "Logging in..." : "Registering...") : formState === 0 ? "Login" : "Register"}
                  </Button>
                </div>

                {/* Footer links */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  {formState === 0 ? (
                    <Link className="text-indigo-600 hover:underline" to={"/forgot-password"}>
                      Forgot password?
                    </Link>
                  ) : (
                    <button
                      onClick={() => setFormState(0)}
                      className="text-indigo-600 hover:underline"
                    >
                      Already have an account? Sign In
                    </button>
                  )}

                  <div className="text-gray-400">v1.0</div>
                </div>
              </Box>
            </div>
          </div>
        </div>
      </div>

      <Snackbar open={open} autoHideDuration={4000} message={message} onClose={() => setOpen(false)} />
    </ThemeProvider>
  );
}
