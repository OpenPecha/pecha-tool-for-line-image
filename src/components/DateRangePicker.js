"use client";

import React, { useState, forwardRef } from "react";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Define CustomInput outside of the main component to avoid the lint warning
const CustomInput = forwardRef(({ value, onClick, ariaLabelledby }, ref) => (
  <button
    className="input input-bordered w-full text-left flex items-center"
    onClick={onClick}
    ref={ref}
    type="button"
    aria-labelledby={ariaLabelledby}
  >
    {value || "Select date range"}
  </button>
));

CustomInput.displayName = "CustomInput";

CustomInput.propTypes = {
  value: PropTypes.string,
  onClick: PropTypes.func,
  ariaLabelledby: PropTypes.string,
};

CustomInput.defaultProps = {
  value: "",
  onClick: () => {},
  ariaLabelledby: undefined,
};

export function DateRangePicker({
  value,
  onChange,
  "aria-labelledby": ariaLabelledby,
}) {
  const [startDate, setStartDate] = useState(value.from);
  const [endDate, setEndDate] = useState(value.to);

  const handleStartDateChange = (date) => {
    setStartDate(date);
    onChange({ from: date, to: endDate });
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
    onChange({ from: startDate, to: date });
  };

  // Get today's date (without time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="w-full">
      <DatePicker
        selected={startDate}
        onChange={handleStartDateChange}
        selectsStart
        startDate={startDate}
        endDate={endDate}
        maxDate={today}
        customInput={<CustomInput ariaLabelledby={ariaLabelledby} />}
        popperPlacement="bottom-start"
      />
      <span className="mx-2">to</span>
      <DatePicker
        selected={endDate}
        onChange={handleEndDateChange}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
        maxDate={today}
        customInput={<CustomInput ariaLabelledby={ariaLabelledby} />}
        popperPlacement="bottom-start"
      />
    </div>
  );
}

DateRangePicker.propTypes = {
  value: PropTypes.shape({
    from: PropTypes.instanceOf(Date),
    to: PropTypes.instanceOf(Date),
  }),
  onChange: PropTypes.func.isRequired,
  "aria-labelledby": PropTypes.string,
};

DateRangePicker.defaultProps = {
  value: {
    from: undefined,
    to: undefined,
  },
  "aria-labelledby": undefined,
};
