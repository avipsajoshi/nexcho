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

export default function Authentication() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [formState, setFormState] = React.useState(0); // 0 = login, 1 = register
  const [open, setOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);
  const navigate = useNavigate();

  const handleResetFields = () => {
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
  };

  const handleAuth = async () => {
    setError("");
    setMessage("");
    try {
      if (formState === 0) {
        // Login
        let result = await handleLogin(username, password);
        if (result && result.success) {
          setMessage("Login successful!");
          setOpen(true);
          navigate("/home"); // immediate navigation after login success
        } else {
          setError(result?.message || "Login failed");
        }
      }

      if (formState === 1) {
        // Register
        let result = await handleRegister(name, username, email, password);
        setMessage(result);
        setOpen(true);
        // Clear fields but **do not** switch back to login
        setName("");
        setUsername("");
        setEmail("");
        setPassword("");
        navigate("/home"); // navigate directly to home after registration
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || "Something went wrong";
      setError(errMsg);
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 px-4">
        {/* Card */}
        <div className="w-full max-w-lg bg-transparent rounded-xl shadow-lg overflow-hidden grid grid-cols-1">
          {/* Left: visual / hero (hidden on small screens) */}
          {/* <div
            className="hidden md:block bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://source.unsplash.com/random?wallpapers&1')",
            }}
            aria-hidden="true"
          /> */}

          {/* Right: form */}
          <div className="bg-white p-8 md:p-10 flex flex-col justify-center">
            <div className="mx-auto w-full max-w-md">
              {/* Top avatar & title */}
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="bg-indigo-600">
                  <LockOutlinedIcon style={{ color: "white" }} />
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Welcome back</h2>
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
                    setError("");
                    setMessage("");
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
                    setError("");
                    setMessage("");
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
                {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2"
                  >
                    {formState === 0 ? "Login" : "Register"}
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

      <Snackbar open={open} autoHideDuration={4000} message={message} />
    </ThemeProvider>
  );
}
