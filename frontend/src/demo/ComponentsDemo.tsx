import React from 'react';
import { PresentationFeedbackComponent } from '../components/analysis/PresentationFeedbackComponent';
import { QuestionsComponent } from '../components/analysis/QuestionsComponent';
import { PitchEvaluationComponent } from '../components/analysis/PitchEvaluationComponent';

// demo data for testing components
const demoData = {
  presentationFeedback: {
    pros: [
      "Четкая структура презентации с логичным переходом между блоками",
      "Убедительные аргументы с конкретными примерами и цифрами",
      "Профессиональная подача материала с уверенной интонацией",
      "Хорошее понимание потребностей целевой аудитории"
    ],
    cons: [
      "Недостаточно времени уделено взаимодействию с аудиторией",
      "Некоторые технические термины требуют дополнительного объяснения",
      "Отсутствует четкий призыв к действию в заключении"
    ],
    recommendations: [
      "Добавить интерактивные элементы для вовлечения аудитории",
      "Включить глоссарий или краткие объяснения сложных терминов",
      "Завершить презентацию конкретным предложением к сотрудничеству",
      "Рассмотреть возможность добавления кейсов успешных клиентов",
      "Усилить эмоциональную составляющую в ключевых моментах"
    ],
    feedback: "Качественная бизнес-презентация с сильной структурой и убедительными аргументами. Материал хорошо подготовлен и демонстрирует глубокое понимание продукта. Для повышения эффективности рекомендуется добавить больше интерактивности и усилить призыв к действию."
  },
  
  questions: [
    "Какова ожидаемая окупаемость инвестиций при внедрении вашего решения?",
    "Как ваш продукт отличается от существующих решений на рынке?",
    "Какие риски могут возникнуть при внедрении и как их минимизировать?",
    "Каков план масштабирования решения для крупных предприятий?",
    "Какая поддержка предоставляется клиентам после внедрения?"
  ],
  
  pitchEvaluation: {
    marks: {
      structure: 8,
      clarity: 7,
      specificity: 6,
      persuasiveness: 9
    },
    missing_blocks: ["доказательства", "ценность", "призыв"]
  }
};

export const ComponentsDemo: React.FC = () => {
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '40px',
        color: '#1f2937',
        fontSize: '2rem',
        fontWeight: '700'
      }}>
        Демо новых компонентов анализа
      </h1>

      <PitchEvaluationComponent 
        marks={demoData.pitchEvaluation.marks}
        missing_blocks={demoData.pitchEvaluation.missing_blocks}
        isLoading={false}
        hasError={false}
      />

      <QuestionsComponent 
        questions={demoData.questions}
        isLoading={false}
        hasError={false}
      />

      <PresentationFeedbackComponent 
        pros={demoData.presentationFeedback.pros}
        cons={demoData.presentationFeedback.cons}
        recommendations={demoData.presentationFeedback.recommendations}
        feedback={demoData.presentationFeedback.feedback}
        isLoading={false}
        hasError={false}
      />
    </div>
  );
};