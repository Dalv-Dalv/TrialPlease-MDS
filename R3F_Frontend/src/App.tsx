import { AuthProvider } from './store/auth'
import { CaseGeneratorProvider } from './store/case-generator-store/caseGeneratorStore'
import { LawyerProvider } from './store/lawyer-store/lawyerStore'
import Trial from './pages/trial/Trial'

export default function App() {
  return (
    <AuthProvider>
      <CaseGeneratorProvider>
        <LawyerProvider>
          <Trial />
        </LawyerProvider>
      </CaseGeneratorProvider>
    </AuthProvider>
  )
}
