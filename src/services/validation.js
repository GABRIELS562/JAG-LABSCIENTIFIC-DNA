export const validatePaternityForm = (formData) => {
  const errors = {};

  // Reference Kit validation
  if (!formData.refKitNumber.trim()) {
    errors.refKitNumber = "Reference Kit Number is required";
  }

  // Mother validation (if not marked as not available)
  if (!formData.motherNotAvailable) {
    if (!formData.mother.name.trim())
      errors["mother.name"] = "Name is required";
    if (!formData.mother.surname.trim())
      errors["mother.surname"] = "Surname is required";
    if (!formData.mother.dateOfBirth)
      errors["mother.dateOfBirth"] = "Date of Birth is required";
    if (!formData.mother.collectionDate)
      errors["mother.collectionDate"] = "Collection Date is required";
  }

  // Father validation (if not marked as not tested)
  if (!formData.fatherNotTested) {
    if (!formData.father.name.trim())
      errors["father.name"] = "Name is required";
    if (!formData.father.surname.trim())
      errors["father.surname"] = "Surname is required";
    if (!formData.father.dateOfBirth)
      errors["father.dateOfBirth"] = "Date of Birth is required";
    if (!formData.father.collectionDate)
      errors["father.collectionDate"] = "Collection Date is required";
  }

  // Contact validation
  if (!formData.phoneContact.trim()) {
    errors.phoneContact = "Phone contact is required";
  } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phoneContact.trim())) {
    errors.phoneContact = "Please enter a valid phone number";
  }

  if (
    formData.emailContact &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailContact)
  ) {
    errors.emailContact = "Please enter a valid email address";
  }

  return errors;
};
