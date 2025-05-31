module.exports = function gradeApplication(userAnswers, correctQuestions) {
    let score = 0;
  
    for (let i = 0; i < correctQuestions.length; i++) {
      const correctAnswer = correctQuestions[i].correctAnswer;
      if (userAnswers[i] === correctAnswer) {
        score++;
      }
    }
  
    return {
      score,
      passed: score >= 7, // Set pass threshold here
    };
  };
  