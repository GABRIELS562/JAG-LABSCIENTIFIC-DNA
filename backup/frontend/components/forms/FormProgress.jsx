const FormProgress = ({ currentSection, sections }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Stepper activeStep={sections.indexOf(currentSection)}>
        {sections.map((section, index) => (
          <Step key={index}>
            <StepLabel>{section}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}; 