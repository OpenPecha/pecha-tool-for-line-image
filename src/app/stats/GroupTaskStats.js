import React from "react";

const GroupTaskStats = ({ groupStatastic }) => {
  const importedThreshold = 500;

  // Function to generate a random color based on a seed (unique ID)
  const generateRandomColor = (seed) => {
    // List of available background colors in hex format
    const colors = [
      "#EF4444",
      "#3B82F6",
      "#10B981",
      "#F97316",
      "#FBBF24",
      "#F59E0B",
      "#84CC16",
      "#10B981",
      "#06B6D4",
      "#0EA5E9",
      "#6366F1",
      "#D946EF",
      "#EC4899",
      "#14B8A6",
      "#F472B6",
      "#9C4AED",
      // Add more colors as needed
    ];
    // Use the seed to select a random color from the list
    const randomColor = colors[Math.floor(Math.abs(seed) % colors.length)];
    // Return the Tailwind CSS class for the selected color
    return `${randomColor}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5">
      {groupStatastic.map((group) => (
        <div
          key={group.id}
          className={`
           shadow-md rounded-md p-2 md:p-4 ${
             group.taskTranscribingCount < importedThreshold
               ? "border-4 border-red-500"
               : ""
           } 
         `}
          style={{
            backgroundColor: `${generateRandomColor(group.id)}`,
          }}
        >
          <div className="flex justify-center items-center gap-5 text-base md:text-xl font-bold">
            <p>{group.name}</p>
            <p>{group.taskTranscribingCount}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupTaskStats;
