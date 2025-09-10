import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, LabelList } from 'recharts';

export const Analytics: React.FC = () => {
  // mock data - should be loaded from API
  const dynamicsData: { date: string; value: number }[] = [];
  const averageData: { name: string; current: number; previous: number }[] = [];

  const getBestScore = () => {
    if (dynamicsData.length === 0) return 0;
    return Math.max(...dynamicsData.map(item => item.value));
  };

  const getMonthlyGrowth = () => {
    if (dynamicsData.length === 0) return "0.0";
    const firstValue = dynamicsData[0].value;
    const lastValue = dynamicsData[dynamicsData.length - 1].value;
    const growth = lastValue - firstValue;
    return growth >= 0 ? `+${growth.toFixed(1)}` : growth.toFixed(1);
  };

  const getCompletedRecommendations = () => {
    return 0; // Real data should come from API
  };

  const getTodayPracticeTime = () => {
    return "0м"; // Real data should come from API
  };

  return (
    <div>
      <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Ваш прогресс</h3>

      {/* графики */}
      <div style={{ 
        maxWidth: '100%', 
        margin: '0 auto'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '70px', 
          alignItems: 'start'
        }}>
          {/* левая колонка - динамика общей оценки */}
          <div>
            {/* статистические блоки левой колонки */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '16px',
              marginBottom: '16px',
              width: '100%'
            }}>
              {/* всего сессий */}
              <div className="stat-card stat-card-compact accent-blue">
                <div className="stat-card-value">0</div>
                <div className="stat-card-label">Всего сессий</div>
              </div>

              {/* средний балл */}
              <div className="stat-card stat-card-compact accent-green">
                <div className="stat-card-value">0.0</div>
                <div className="stat-card-label">Средний балл</div>
              </div>

              {/* лучший результат */}
              <div className="stat-card stat-card-compact accent-yellow">
                <div className="stat-card-value">{getBestScore().toFixed(1)}</div>
                <div className="stat-card-label">Лучший результат</div>
              </div>

              {/* рост за месяц */}
              <div className="stat-card stat-card-compact accent-teal">
                <div className="stat-card-value">{getMonthlyGrowth()}</div>
                <div className="stat-card-label">Рост за месяц</div>
              </div>
            </div>

            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              minHeight: '400px'
            }}>
              <h3 style={{ marginBottom: '8px' }}>
                Динамика общей оценки
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                {dynamicsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dynamicsData}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#5f6368', fontFamily: 'Inter, sans-serif' }}
                      />
                      <YAxis 
                        domain={[1, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#1a73e8" 
                        strokeWidth={3}
                        dot={{ fill: '#1a73e8', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#1a73e8', strokeWidth: 2 }}
                      />
                      <LabelList 
                        dataKey="value" 
                        position="top"
                        style={{ 
                          fontSize: '14px', 
                          fill: '#202124', 
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '600'
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#6c757d',
                    padding: '40px 20px'
                  }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                      Данные недоступны
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      Динамика появится после нескольких тренировочных сессий
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* правая колонка - средние показатели */}
          <div>
            {/* статистические блоки правой колонки */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '16px',
              marginBottom: '16px',
              width: '100%'
            }}>
              {/* время сегодня */}
              <div className="stat-card stat-card-compact accent-blue">
                <div className="stat-card-value">{getTodayPracticeTime()}</div>
                <div className="stat-card-label">Время сегодня</div>
              </div>

              {/* общее время */}
              <div className="stat-card stat-card-compact accent-orange">
                <div className="stat-card-value">0м</div>
                <div className="stat-card-label">Общее время</div>
              </div>

              {/* дней подряд */}
              <div className="stat-card stat-card-compact accent-purple">
                <div className="stat-card-value">0</div>
                <div className="stat-card-label">Дней подряд</div>
              </div>

              {/* рекомендации выполнены */}
              <div className="stat-card stat-card-compact accent-green">
                <div className="stat-card-value">{getCompletedRecommendations()}%</div>
                <div className="stat-card-label">Рекомендации выполнены</div>
              </div>
            </div>

            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              minHeight: '400px'
            }}>
              <h3 style={{ marginBottom: '8px' }}>
                Средние показатели
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                {averageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={averageData} barCategoryGap="20%">
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#5f6368', fontFamily: 'Inter, sans-serif' }}
                      />
                      <YAxis 
                        domain={[1, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={false}
                      />
                      <Bar 
                        dataKey="previous" 
                        fill="#e5e7eb" 
                        radius={[4, 4, 0, 0]}
                        name="Предыдущий период"
                      />
                      <LabelList 
                        dataKey="previous" 
                        position="top"
                        style={{ 
                          fontSize: '14px', 
                          fill: '#202124', 
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '500'
                        }}
                      />
                      <Bar 
                        dataKey="current" 
                        fill="#1a73e8" 
                        radius={[4, 4, 0, 0]}
                        name="Текущий период"
                      />
                      <LabelList 
                        dataKey="current" 
                        position="top"
                        style={{ 
                          fontSize: '14px', 
                          fill: '#202124', 
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '600'
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#6c757d',
                    padding: '40px 20px'
                  }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                      Данные недоступны
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      Средние показатели появятся после тренировочных сессий
                    </p>
                  </div>
                )}
              </div>
              
              {/* легенда */}
              {averageData.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginTop: '16px',
                  gap: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '2px',
                      marginRight: '8px'
                    }}></div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#5f6368',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      Первое использование
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#1a73e8',
                      borderRadius: '2px',
                      marginRight: '8px'
                    }}></div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#5f6368',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      Сегодня
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};