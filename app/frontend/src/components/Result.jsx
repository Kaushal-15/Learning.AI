import App from "../App.jsx";

export default function Result(name) {
  const studentInfo = {
    Name: "John",
    result: "Got the A+ grade!"
  };

  const CourseList = [
    { courseName: "Mathematics", grade: "A" },
    { courseName: "Science", grade: "B+" },
    { courseName: "History", grade: "A-" },
    { courseName: "Art", grade: "B" },
  ];

  return (
    <div>
      {studentInfo.Name && studentInfo.result ? (
        <App studentInfo={studentInfo} />
      ) : (
        <h1>No Data Available</h1>
      )}
      <ul>
        {CourseList.map((course, index) => (
          <li key={index}>
            <App studentInfo={course} />
          </li>
        ))}
      </ul>
    </div>
  );
}
