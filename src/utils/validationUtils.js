export const validateForm = (formData) => {
	const errors = {};

	// Name validations
	if (!formData.childName.trim()) {
		errors.childName = "Child name is required";
	}
	if (!formData.childSurname.trim()) {
		errors.childSurname = "Child surname is required";
	}
	if (!formData.fatherName.trim()) {
		errors.fatherName = "Father name is required";
	}
	if (!formData.fatherSurname.trim()) {
		errors.fatherSurname = "Father surname is required";
	}

	// ID/DOB validations
	if (!formData.childIdDob.trim()) {
		errors.childIdDob = "Child ID/DOB is required";
	}
	if (!formData.fatherIdDob.trim()) {
		errors.fatherIdDob = "Father ID/DOB is required";
	}

	// Date validations
	if (!formData.childCollectionDate) {
		errors.childCollectionDate = "Child collection date is required";
	}
	if (!formData.fatherCollectionDate) {
		errors.fatherCollectionDate = "Father collection date is required";
	}
	if (!formData.submissionDate) {
		errors.submissionDate = "Submission date is required";
	}

	// Contact validation
	if (
		formData.emailContact &&
		!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.emailContact)
	) {
		errors.emailContact = "Invalid email address";
	}

	const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
	if (!formData.phoneContact) {
		errors.phoneContact = "Phone number is required";
	} else if (!phoneRegex.test(formData.phoneContact)) {
		errors.phoneContact = "Invalid phone number format";
	}

	// Address validation
	if (!formData.addressArea.trim()) {
		errors.addressArea = "Address is required";
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
};
