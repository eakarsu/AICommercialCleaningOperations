const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callOpenRouter(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'AI Cleaning Operations'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
            return;
          }
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve({
            content,
            model: parsed.model,
            usage: parsed.usage
          });
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const aiService = {
  async optimizeRoute(routeData) {
    const systemPrompt = `You are an expert route optimization AI for commercial cleaning operations. Analyze the given route data and provide optimization suggestions. Return a JSON object with: optimized_order (array of stop indices), estimated_time_savings_minutes (number), fuel_savings_percent (number), recommendations (array of strings), and efficiency_score (number 1-100).`;
    const userPrompt = `Optimize this cleaning route:\n${JSON.stringify(routeData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async forecastSupply(supplyData) {
    const systemPrompt = `You are a supply chain forecasting AI for commercial cleaning operations. Analyze supply usage patterns and forecast future needs. Return a JSON object with: forecast_30_days (number), forecast_60_days (number), forecast_90_days (number), reorder_recommendation (string), cost_optimization_tips (array of strings), seasonal_factors (string), confidence_level (string: high/medium/low), and risk_assessment (string).`;
    const userPrompt = `Forecast supply needs for:\n${JSON.stringify(supplyData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async analyzeQualityPhoto(inspectionData) {
    const systemPrompt = `You are a quality inspection AI for commercial cleaning operations. Analyze the inspection data and provide a detailed quality assessment. Return a JSON object with: cleanliness_score (number 1-10), areas_of_concern (array of strings), improvements_needed (array of strings), compliance_status (string), detailed_findings (array of objects with area, score, and notes), overall_assessment (string), and priority_actions (array of strings).`;
    const userPrompt = `Analyze this cleaning quality inspection:\n${JSON.stringify(inspectionData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async calculateContractPrice(contractData) {
    const systemPrompt = `You are a contract pricing AI for commercial cleaning operations. Calculate optimal pricing based on property details, services, and market rates. Return a JSON object with: recommended_monthly_price (number), price_breakdown (object with labor, supplies, overhead, profit_margin), competitive_analysis (string), pricing_tier (string: budget/standard/premium), annual_value (number), discount_recommendations (string), and profitability_score (number 1-100).`;
    const userPrompt = `Calculate pricing for this cleaning contract:\n${JSON.stringify(contractData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async analyzeCompliance(complianceData) {
    const systemPrompt = `You are a regulatory compliance AI for commercial cleaning operations. Analyze compliance status and provide recommendations. Return a JSON object with: risk_level (string: low/medium/high/critical), recommendations (array of strings), upcoming_deadlines (array of objects with item and date), training_needs (array of strings), documentation_gaps (array of strings), regulatory_updates (array of strings), and action_plan (array of objects with action, priority, and deadline).`;
    const userPrompt = `Analyze compliance status for:\n${JSON.stringify(complianceData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async analyzeCrewPerformance(crewData) {
    const systemPrompt = `You are a workforce performance AI for commercial cleaning operations. Analyze crew performance data and provide actionable insights. Return a JSON object with: overall_rating (string), strengths (array of strings), improvement_areas (array of strings), training_recommendations (array of strings), optimal_shift_assignment (string), workload_assessment (string), productivity_score (number 1-100), and team_dynamics_notes (string).`;
    const userPrompt = `Analyze crew performance for:\n${JSON.stringify(crewData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async analyzeClientRetention(clientData) {
    const systemPrompt = `You are a client retention AI for commercial cleaning operations. Analyze client data and predict churn risk, satisfaction trends, and upsell opportunities. Return a JSON object with: churn_risk (string: low/medium/high), churn_probability_percent (number), satisfaction_trend (string), upsell_opportunities (array of strings), retention_strategies (array of strings), lifetime_value_estimate (number), engagement_score (number 1-100), and recommended_actions (array of strings).`;
    const userPrompt = `Analyze client retention for:\n${JSON.stringify(clientData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async optimizeWorkOrder(workOrderData) {
    const systemPrompt = `You are a work order scheduling AI for commercial cleaning operations. Analyze the work order and suggest optimal scheduling, crew assignment, and resource allocation. Return a JSON object with: recommended_crew (string), optimal_time_slot (string), estimated_duration_hours (number), required_supplies (array of strings), required_equipment (array of strings), cost_estimate (number), efficiency_tips (array of strings), and risk_factors (array of strings).`;
    const userPrompt = `Optimize this work order:\n${JSON.stringify(workOrderData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async predictEquipmentMaintenance(equipmentData) {
    const systemPrompt = `You are an equipment maintenance prediction AI for commercial cleaning operations. Analyze equipment data and predict maintenance needs. Return a JSON object with: predicted_failure_date (string), maintenance_urgency (string: low/medium/high/critical), recommended_maintenance (array of strings), estimated_repair_cost (number), replacement_recommendation (string), remaining_useful_life_months (number), cost_of_ownership_monthly (number), and preventive_actions (array of strings).`;
    const userPrompt = `Predict maintenance for:\n${JSON.stringify(equipmentData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async analyzeBilling(invoiceData) {
    const systemPrompt = `You are a billing analytics AI for commercial cleaning operations. Analyze invoice data and provide financial insights. Return a JSON object with: payment_risk (string: low/medium/high), revenue_trend (string), collection_probability_percent (number), pricing_optimization (array of strings), cash_flow_impact (string), late_payment_prediction (string), discount_recommendation (string), and financial_health_score (number 1-100).`;
    const userPrompt = `Analyze billing data for:\n${JSON.stringify(invoiceData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  },

  async analyzeIncidentRisk(incidentData) {
    const systemPrompt = `You are a risk analysis AI for commercial cleaning operations. Analyze incident data and provide safety recommendations. Return a JSON object with: risk_level (string: low/medium/high/critical), root_cause_analysis (string), preventive_measures (array of strings), training_needed (array of strings), insurance_implications (string), recurrence_probability (string), estimated_total_cost (number), safety_score_impact (string), and corrective_actions (array of objects with action, priority, and deadline).`;
    const userPrompt = `Analyze this incident:\n${JSON.stringify(incidentData, null, 2)}`;
    return callOpenRouter(systemPrompt, userPrompt);
  }
};

module.exports = aiService;
