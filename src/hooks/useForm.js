import { useState, useCallback } from 'react';

/**
 * Custom hook for form state management with validation
 * @param {Object} initialValues - Initial form values
 * @param {Object} options - Configuration options
 * @returns {Object} Form state and handlers
 */
export function useForm(initialValues = {}, options = {}) {
  const {
    validate = null,
    onSubmit = null,
    resetAfterSubmit = false
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }, [errors]);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [name]: isTouched
    }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (!validate) return true;
    
    const validationErrors = validate(values);
    setErrors(validationErrors || {});
    
    return !validationErrors || Object.keys(validationErrors).length === 0;
  }, [validate, values]);

  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    setValue(name, fieldValue);
  }, [setValue]);

  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    setFieldTouched(name, true);
    
    // Validate single field on blur if validator is provided
    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors && validationErrors[name]) {
        setFieldError(name, validationErrors[name]);
      }
    }
  }, [validate, values, setFieldTouched, setFieldError]);

  const handleSubmit = useCallback(async (event) => {
    if (event) {
      event.preventDefault();
    }
    
    setIsSubmitting(true);
    
    // Mark all fields as touched
    const touchedFields = {};
    Object.keys(values).forEach(key => {
      touchedFields[key] = true;
    });
    setTouched(touchedFields);
    
    // Validate form
    const isValid = validateForm();
    
    if (isValid && onSubmit) {
      try {
        await onSubmit(values);
        
        if (resetAfterSubmit) {
          reset();
        }
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [values, validateForm, onSubmit, resetAfterSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFormValues = useCallback((newValues) => {
    setValues(newValues);
  }, []);

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setFieldTouched,
    setFieldError,
    setFormValues,
    handleChange,
    handleBlur,
    handleSubmit,
    validateForm,
    reset
  };
}

/**
 * Custom hook for managing multi-step forms
 * @param {Array} steps - Array of step configurations
 * @param {Object} initialValues - Initial form values
 * @returns {Object} Multi-step form state and handlers
 */
export function useMultiStepForm(steps = [], initialValues = {}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  
  const form = useForm(initialValues, {
    validate: steps[currentStep]?.validate
  });

  const nextStep = useCallback(() => {
    const isValid = form.validateForm();
    
    if (isValid) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
    
    return isValid;
  }, [form, currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [steps.length]);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const canGoNext = form.isValid;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return {
    ...form,
    currentStep,
    completedSteps,
    steps,
    isFirstStep,
    isLastStep,
    canGoNext,
    progress,
    nextStep,
    prevStep,
    goToStep
  };
}

export default useForm;