export const qualityControlService = {
  // Batch QC checks
  validateBatchControls: (batchData) => {
    const controls = {
      allelicLadder: batchData.filter((well) => well.type === "Allelic Ladder"),
      positiveControl: batchData.filter(
        (well) => well.type === "Positive Control",
      ),
      negativeControl: batchData.filter(
        (well) => well.type === "Negative Control",
      ),
    };

    const validations = {
      hasRequiredControls:
        controls.allelicLadder.length >= 2 &&
        controls.positiveControl.length >= 1 &&
        controls.negativeControl.length >= 1,

      controlPositions: {
        allelicLadder: controls.allelicLadder.map((c) => c.well),
        positiveControl: controls.positiveControl.map((c) => c.well),
        negativeControl: controls.negativeControl.map((c) => c.well),
      },

      status: "pending",
    };

    return validations;
  },

  // Equipment calibration checks
  checkCalibrationStatus: async (equipmentId) => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}/calibration`);
      return response.json();
    } catch (error) {
      console.error("Error checking calibration:", error);
      throw error;
    }
  },

  // Maintenance tracking
  logMaintenance: async (maintenanceData) => {
    try {
      const response = await fetch("/api/maintenance/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(maintenanceData),
      });
      return response.json();
    } catch (error) {
      console.error("Error logging maintenance:", error);
      throw error;
    }
  },
};
