package expo.modules.smartdesknative.audio

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

/**
 * Registers [SystemAudioVisualizerModule]. Injected into `MainApplication` by
 * `plugins/withAudioVisualizer.js`, so `npx expo prebuild` regenerates the
 * registration instead of wiping it.
 */
class SystemAudioVisualizerPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == MODULE_NAME) SystemAudioVisualizerModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        MODULE_NAME to ReactModuleInfo(
          MODULE_NAME,
          SystemAudioVisualizerModule::class.java.name,
          /* canOverrideExistingModule = */ false,
          /* needsEagerInit = */ false,
          /* isCxxModule = */ false,
          /* isTurboModule = */ false
        )
      )
    }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<in Nothing, in Nothing>> = emptyList()

  private companion object {
    const val MODULE_NAME = "SystemAudioVisualizer"
  }
}
