import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';
import { FloatingAssistantUI } from './src/components/FloatingAssistantUI';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Android native overlay service mounts this independent React root.
AppRegistry.registerComponent('FloatingAssistant', () => FloatingAssistantUI);
