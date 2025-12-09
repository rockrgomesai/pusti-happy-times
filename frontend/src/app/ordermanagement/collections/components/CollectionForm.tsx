"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Checkbox,
} from "@mui/material";

import { 
  AttachFile as AttachFileIcon, 
  Close as CloseIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import collectionsApi, { CollectionFormData } from "@/services/collectionsApi";
import toast from "react-hot-toast";
import ImageViewer from "@/components/common/ImageViewer";

interface CollectionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDONumber?: string;
  distributorId?: string;
  collection?: any; // For edit mode
}

interface Bank {
  _id: string;
  name: string;
  short_name: string;
}

export default function CollectionForm({
  open,
  onClose,
  onSuccess,
  defaultDONumber,
  distributorId,
  collection,
}: CollectionFormProps) {
  const isEditMode = !!collection;
  
  // Helper function to extract numeric value from Decimal128 or regular number
  const getNumericValue = (value: any): number | string => {
    if (value === null || value === undefined) return "";
    if (typeof value === 'object' && value.$numberDecimal) {
      return parseFloat(value.$numberDecimal) || "";
    }
    if (typeof value === 'number') return value;
    return parseFloat(value) || "";
  };
  
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  const [formData, setFormData] = useState<CollectionFormData>({
    payment_method: "Bank",
    depositor_mobile: "",
    deposit_amount: "",
    deposit_date: new Date().toISOString().split("T")[0],
    do_no: defaultDONumber || "",
    note: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [isAcPayeeCheck, setIsAcPayeeCheck] = useState(false);
  const [checkNumber, setCheckNumber] = useState("");

  useEffect(() => {
    if (open) {
      loadBanks();
      
      if (collection) {
        // Edit mode: populate form with existing data
        setFormData({
          payment_method: collection.payment_method,
          depositor_mobile: collection.depositor_mobile || "",
          deposit_amount: collection.deposit_amount || "",
          deposit_date: collection.deposit_date?.split("T")[0] || new Date().toISOString().split("T")[0],
          do_no: collection.do_no || "",
          note: collection.note || "",
          cash_method: collection.cash_method || "",
          // Extract _id from populated bank objects
          company_bank: collection.company_bank?._id || collection.company_bank || "",
          company_bank_account_no: collection.company_bank_account_no || "",
          depositor_bank: collection.depositor_bank?._id || collection.depositor_bank || "",
          depositor_branch: collection.depositor_branch || "",
        });
        // Set existing image
        setExistingImage(collection.image || null);
        // Set A/C Payee Check states
        setIsAcPayeeCheck(!!collection.check_number);
        setCheckNumber(collection.check_number || "");
      } else {
        // Create mode: reset form
        setFormData({
          payment_method: "Bank",
          depositor_mobile: "",
          deposit_amount: "",
          deposit_date: new Date().toISOString().split("T")[0],
          do_no: defaultDONumber || "",
          note: "",
        });
        setExistingImage(null);
        setIsAcPayeeCheck(false);
        setCheckNumber("");
      }
      setSelectedFile(null);
      setErrors({});
    }
  }, [open, defaultDONumber, collection]);

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);
      const response = await collectionsApi.getActiveBanks();
      setBanks(response.data);
    } catch (error: any) {
      toast.error("Failed to load banks");
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleChange = (field: keyof CollectionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePaymentMethodChange = (method: "Bank" | "Cash") => {
    setFormData((prev) => ({
      ...prev,
      payment_method: method,
      // Clear method-specific fields
      company_bank: undefined,
      company_bank_account_no: undefined,
      depositor_bank: undefined,
      depositor_branch: undefined,
      cash_method: undefined,
    }));
    
    // Clear A/C Payee Check states when switching to Cash
    if (method === "Cash") {
      setIsAcPayeeCheck(false);
      setCheckNumber("");
    }
    
    setErrors({});
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and PDF files are allowed");
      return;
    }

    // Validate file size (8MB)
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File size must not exceed 8MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleRemoveExistingImage = () => {
    setExistingImage(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.depositor_mobile) {
      newErrors.depositor_mobile = "Depositor mobile is required";
    } else if (!/^[0-9+\- ]{11,15}$/.test(formData.depositor_mobile)) {
      newErrors.depositor_mobile = "Invalid mobile number";
    }

    const depositAmount = typeof formData.deposit_amount === "string" 
      ? parseFloat(formData.deposit_amount) 
      : formData.deposit_amount;
    if (!formData.deposit_amount || isNaN(depositAmount) || depositAmount <= 0) {
      newErrors.deposit_amount = "Deposit amount must be greater than 0";
    }

    if (!formData.deposit_date) {
      newErrors.deposit_date = "Deposit date is required";
    }

    // Payment method specific validations
    if (formData.payment_method === "Bank") {
      // A/C Payee Check validation (only for Bank payments)
      if (isAcPayeeCheck && !checkNumber.trim()) {
        newErrors.check_number = "Check number is required for A/C Payee checks";
      }
      
      // Bank field validations
      if (!formData.company_bank) {
        newErrors.company_bank = "Company bank is required";
      }
      if (!formData.company_bank_account_no) {
        newErrors.company_bank_account_no = "Account number is required";
      }
      if (!formData.depositor_bank) {
        newErrors.depositor_bank = "Depositor bank is required";
      }
      if (!formData.depositor_branch) {
        newErrors.depositor_branch = "Depositor branch is required";
      }
    } else if (formData.payment_method === "Cash") {
      if (!formData.cash_method) {
        newErrors.cash_method = "Cash method is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      // Create FormData for file upload
      const submitData = new FormData();

      // Add distributor_id if provided (for HQ users adding payment to distributor's order)
      if (distributorId) {
        submitData.append("distributor_id", distributorId);
      }

      // Add all form fields
      Object.keys(formData).forEach((key) => {
        const value = formData[key as keyof CollectionFormData];
        if (value !== undefined && value !== null && value !== "") {
          // Special handling for deposit_amount to ensure it's a valid number
          if (key === "deposit_amount") {
            const numValue = typeof value === "string" ? parseFloat(value) : value;
            console.log("deposit_amount before submit:", value, "parsed:", numValue);
            if (!isNaN(numValue as number)) {
              submitData.append(key, numValue.toString());
              console.log("deposit_amount appended to FormData:", numValue.toString());
            } else {
              console.error("deposit_amount is NaN, not appending");
            }
          } else {
            submitData.append(key, value.toString());
          }
        }
      });

      // Add A/C Payee Check data
      if (isAcPayeeCheck && checkNumber.trim()) {
        submitData.append("check_number", checkNumber.trim());
        submitData.append("is_ac_payee_check", "true");
      }

      // Add file if selected
      if (selectedFile) {
        submitData.append("image", selectedFile);
      }

      // Log all FormData entries
      console.log("FormData entries being sent:");
      for (const pair of submitData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      if (isEditMode && collection) {
        // Edit existing collection
        await collectionsApi.edit(collection._id, submitData);
        toast.success("Payment updated successfully");
      } else {
        // Create new collection
        await collectionsApi.createCollection(submitData);
        toast.success("Payment created successfully");
      }
      
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} collection`);
    } finally {
      setLoading(false);
    }
  };

  const cashMethods = [
    "Petty Cash",
    "Provision for Commission",
    "Provision for Incentive",
    "Provision for Damage",
  ];

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditMode ? "Edit Payment" : "Add New Payment"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Payment Method */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Payment Method *
            </Typography>
            <RadioGroup
              row
              value={formData.payment_method}
              onChange={(e) => handlePaymentMethodChange(e.target.value as "Bank" | "Cash")}
            >
              <FormControlLabel value="Bank" control={<Radio />} label="Bank" />
              <FormControlLabel value="Cash" control={<Radio />} label="Cash" />
            </RadioGroup>
          </Box>

          {/* Bank Payment Fields */}
          {formData.payment_method === "Bank" && (
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Bank Payment Details
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  select
                  label="Company Bank *"
                  value={formData.company_bank || ""}
                  onChange={(e) => handleChange("company_bank", e.target.value)}
                  error={!!errors.company_bank}
                  helperText={errors.company_bank}
                  disabled={loadingBanks}
                  fullWidth
                >
                  {loadingBanks ? (
                    <MenuItem disabled>Loading banks...</MenuItem>
                  ) : (
                    banks.map((bank) => (
                      <MenuItem key={bank._id} value={bank._id}>
                        {bank.name}
                      </MenuItem>
                    ))
                  )}
                </TextField>

                <TextField
                  label="Company Bank Account No *"
                  value={formData.company_bank_account_no || ""}
                  onChange={(e) => handleChange("company_bank_account_no", e.target.value)}
                  error={!!errors.company_bank_account_no}
                  helperText={errors.company_bank_account_no}
                  placeholder="1234567890123"
                  fullWidth
                />

                <TextField
                  select
                  label="Depositor Bank *"
                  value={formData.depositor_bank || ""}
                  onChange={(e) => handleChange("depositor_bank", e.target.value)}
                  error={!!errors.depositor_bank}
                  helperText={errors.depositor_bank}
                  disabled={loadingBanks}
                  fullWidth
                >
                  {loadingBanks ? (
                    <MenuItem disabled>Loading banks...</MenuItem>
                  ) : (
                    banks.map((bank) => (
                      <MenuItem key={bank._id} value={bank._id}>
                        {bank.name}
                      </MenuItem>
                    ))
                  )}
                </TextField>

                <TextField
                  label="Depositor Branch *"
                  value={formData.depositor_branch || ""}
                  onChange={(e) => handleChange("depositor_branch", e.target.value)}
                  error={!!errors.depositor_branch}
                  helperText={errors.depositor_branch}
                  placeholder="Motijheel"
                  fullWidth
                />
              </Stack>
            </Box>
          )}

          {/* Cash Payment Fields */}
          {formData.payment_method === "Cash" && (
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Cash Payment Details
              </Typography>
              <TextField
                select
                label="Cash Method *"
                value={formData.cash_method || ""}
                onChange={(e) => handleChange("cash_method", e.target.value)}
                error={!!errors.cash_method}
                helperText={errors.cash_method}
                fullWidth
                sx={{ mt: 2 }}
              >
                {cashMethods.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          {/* Common Fields */}
          <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Common Details
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {/* Depositor Mobile and A/C Payee Check (Bank only) */}
              {formData.payment_method === "Bank" ? (
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: { xs: 1, sm: '0 0 65%' } }}>
                    <TextField
                      label="Depositor Mobile *"
                      value={formData.depositor_mobile}
                      onChange={(e) => handleChange("depositor_mobile", e.target.value)}
                      error={!!errors.depositor_mobile}
                      helperText={errors.depositor_mobile}
                      placeholder="01712345678"
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ flex: { xs: 1, sm: '0 0 calc(35% - 16px)' }, display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isAcPayeeCheck}
                          onChange={(e) => {
                            setIsAcPayeeCheck(e.target.checked);
                            if (!e.target.checked) {
                              setCheckNumber("");
                              setErrors((prev) => ({ ...prev, check_number: "" }));
                            }
                          }}
                        />
                      }
                      label="A/C Payee Check"
                    />
                  </Box>
                </Box>
              ) : (
                <TextField
                  label="Depositor Mobile *"
                  value={formData.depositor_mobile}
                  onChange={(e) => handleChange("depositor_mobile", e.target.value)}
                  error={!!errors.depositor_mobile}
                  helperText={errors.depositor_mobile}
                  placeholder="01712345678"
                  fullWidth
                />
              )}

              {/* Deposit Amount and Check Number (Check Number for Bank only) */}
              {formData.payment_method === "Bank" ? (
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label="Deposit Amount (BDT) *"
                      type="number"
                      value={formData.deposit_amount === "" || formData.deposit_amount === 0 ? "" : formData.deposit_amount}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === "" || inputValue === null) {
                          handleChange("deposit_amount", "");
                        } else {
                          const numValue = parseFloat(inputValue);
                          handleChange("deposit_amount", isNaN(numValue) ? "" : numValue);
                        }
                      }}
                      error={!!errors.deposit_amount}
                      helperText={errors.deposit_amount}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                      }}
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      label={`Check Number${isAcPayeeCheck ? ' *' : ''}`}
                      value={checkNumber}
                      onChange={(e) => {
                        setCheckNumber(e.target.value);
                        if (errors.check_number) {
                          setErrors((prev) => ({ ...prev, check_number: "" }));
                        }
                      }}
                      disabled={!isAcPayeeCheck}
                      error={!!errors.check_number}
                      helperText={errors.check_number || (isAcPayeeCheck ? "Required for A/C Payee checks" : "Enable A/C Payee Check to enter")}
                      placeholder="123456"
                      fullWidth
                    />
                  </Box>
                </Box>
              ) : (
                <TextField
                  label="Deposit Amount (BDT) *"
                  type="number"
                  value={formData.deposit_amount === "" || formData.deposit_amount === 0 ? "" : formData.deposit_amount}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === "" || inputValue === null) {
                      handleChange("deposit_amount", "");
                    } else {
                      const numValue = parseFloat(inputValue);
                      handleChange("deposit_amount", isNaN(numValue) ? "" : numValue);
                    }
                  }}
                  error={!!errors.deposit_amount}
                  helperText={errors.deposit_amount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  fullWidth
                />
              )}

              <TextField
                type="date"
                label="Deposit Date *"
                value={formData.deposit_date}
                onChange={(e) => handleChange("deposit_date", e.target.value)}
                inputProps={{ max: new Date().toISOString().split('T')[0] }}
                error={!!errors.deposit_date}
                helperText={errors.deposit_date || "Format: DD/MM/YYYY"}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <TextField
                label="Demand Order Number (Optional)"
                value={formData.do_no}
                onChange={(e) => handleChange("do_no", e.target.value)}
                placeholder="DO-20250108-00001"
                helperText="Leave empty if not linked to any demand order"
                fullWidth
              />

              <TextField
                label="Note (Optional)"
                value={formData.note}
                onChange={(e) => handleChange("note", e.target.value)}
                multiline
                rows={3}
                placeholder="Add any additional notes..."
                fullWidth
              />

              {/* File Upload */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Upload Receipt/Slip (Optional)
                </Typography>
                
                {/* Show existing image if in edit mode */}
                {existingImage && (
                  <Box
                    sx={{
                      mt: 1,
                      mb: 2,
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {existingImage.mime_type === "application/pdf" ? (
                      <PdfIcon sx={{ fontSize: 40, color: "error.main" }} />
                    ) : (
                      <ImageIcon sx={{ fontSize: 40, color: "primary.main" }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {existingImage.file_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(existingImage.file_size / 1024).toFixed(0)} KB •{" "}
                        {existingImage.mime_type === "application/pdf" ? "PDF" : "Image"}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setImageViewerOpen(true)}
                      title="View image"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleRemoveExistingImage} title="Remove and upload new">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}

                {/* Upload button - always show */}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AttachFileIcon />}
                  fullWidth
                  sx={{ mt: existingImage ? 0 : 1 }}
                >
                  {existingImage ? "Replace File" : "Choose File"}
                  <input type="file" hidden accept="image/*,application/pdf" onChange={handleFileChange} />
                </Button>
                
                {/* Show newly selected file */}
                {selectedFile && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2">{selectedFile.name}</Typography>
                    <IconButton size="small" onClick={handleRemoveFile}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Max size: 8MB • Formats: JPG, PNG, PDF
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : isEditMode ? "Update Payment" : "Submit Payment"}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Image Viewer */}
    {existingImage && (
      <ImageViewer
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}${existingImage.file_path}`}
        imageName={existingImage.file_name}
        imageType={existingImage.mime_type}
      />
    )}
    </>
  );
}
