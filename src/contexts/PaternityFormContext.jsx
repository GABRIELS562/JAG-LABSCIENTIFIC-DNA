import { createContext, useContext, useReducer } from 'react';

const PaternityFormContext = createContext(null);

const formReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.field]: action.value
      };
    case 'UPDATE_SECTION':
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          [action.field]: action.value
        }
      };
    case 'TOGGLE_SECTION':
      return {
        ...state,
        [`${action.section}NotAvailable`]: !state[`${action.section}NotAvailable`],
        [action.section]: state[`${action.section}NotAvailable`] 
          ? { ...initialFormState[action.section] }
          : state[action.section]
      };
    case 'RESET_FORM':
      return { ...initialFormState };
    default:
      return state;
  }
};

export const PaternityFormProvider = ({ children }) => {
  const [formData, dispatch] = useReducer(formReducer, initialFormState);

  return (
    <PaternityFormContext.Provider value={{ formData, dispatch }}>
      {children}
    </PaternityFormContext.Provider>
  );
};

export const usePaternityForm = () => {
  const context = useContext(PaternityFormContext);
  if (!context) {
    throw new Error('usePaternityForm must be used within a PaternityFormProvider');
  }
  return context;
}; 