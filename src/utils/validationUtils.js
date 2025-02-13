export const validateForm = (formData) => {
	const errors = {};

	// Reference Kit Number validation
	if (!formData.refKitNumber?.trim()) {
		errors.refKitNumber = "Reference Kit Number is required";
	}

	// Child validations
	if (!formData.childName?.trim()) {
		errors.childName = "Child name is required";
	}
	if (!formData.childSurname?.trim()) {
		errors.childSurname = "Child surname is required";
	}
	if (!formData.childIdDob?.trim()) {
		errors.childIdDob = "Child ID/DOB is required";
	}
	if (!formData.childCollectionDate) {
		errors.childCollectionDate = "Child collection date is required";
	}

	// Mother validations
	if (!formData.motherName?.trim()) {
		errors.motherName = "Mother name is required";
	}
	if (!formData.motherSurname?.trim()) {
		errors.motherSurname = "Mother surname is required";
	}
	if (!formData.motherIdDob?.trim()) {
		errors.motherIdDob = "Mother ID/DOB is required";
	}
	if (!formData.motherCollectionDate) {
		errors.motherCollectionDate = "Mother collection date is required";
	}

	// Father validations (only if not marked as NOT TESTED)
	if (!formData.fatherNotTested) {
		if (!formData.fatherName?.trim()) {
			errors.fatherName = "Father name is required when testing";
		}
		if (!formData.fatherSurname?.trim()) {
			errors.fatherSurname = "Father surname is required when testing";
		}
		// Father ID/DOB and collection date are optional
	}

	// Email validations
	const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

	// Validate mother email format if provided
	if (formData.motherEmail && !emailRegex.test(formData.motherEmail)) {
		errors.motherEmail = "Invalid email address";
	}

	// Validate father email format if provided and not marked as NOT TESTED
	if (
		!formData.fatherNotTested &&
		formData.fatherEmail &&
		!emailRegex.test(formData.fatherEmail)
	) {
		errors.fatherEmail = "Invalid email address";
	}

	// Check if at least one parent email is provided when father is being tested
	if (
		!formData.fatherNotTested &&
		!formData.motherEmail &&
		!formData.fatherEmail
	) {
		errors.motherEmail = "At least one parent email is required";
		errors.fatherEmail = "At least one parent email is required";
	}

	// Date validations
	if (!formData.submissionDate) {
		errors.submissionDate = "Submission date is required";
	}

	// Phone validation
	const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
	if (!formData.phoneContact) {
		errors.phoneContact = "Phone number is required";
	} else if (!phoneRegex.test(formData.phoneContact)) {
		errors.phoneContact = "Invalid phone number format";
	}

	// Email contact validation (if provided)
	if (formData.emailContact && !emailRegex.test(formData.emailContact)) {
		errors.emailContact = "Invalid email address";
	}

	// Address validation - no longer required
	// if (!formData.addressArea?.trim()) {
	//   errors.addressArea = "Address is required";
	// }

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
};
