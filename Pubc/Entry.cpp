/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <iomanip>

#include "BlackRoot/Pubc/Math Types.h"
#include "BlackRoot/Pubc/Threaded IO Stream.h"

#include "ToolboxBase/Pubc/Entry.h"
#include "ToolboxBase/Pubc/Base Messages.h"
#include "ToolboxBase/Pubc/Environment Bootstrap.h"

#include "IrisBase/Pubc/Version.h"
#include "IrisBase/Pubc/Environment.h"

#include "IrisBase/Pubc/Register.h"

#include <cstdio>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <array>
#include <complex>

int irisMain(Toolbox::Util::EnvironmentBootstrap &bootstrap)
{
    using cout = BlackRoot::Util::Cout;
    
    cout{} << BlackRoot::Repo::VersionRegistry::GetBootString() << std::endl << std::endl;

	IrisBack::Core::Environment * environment = new IrisBack::Core::Environment();
	Toolbox::Core::SetEnvironment(environment);
	std::thread t1([&](){
        environment->Run();
    });
    
	std::this_thread::sleep_for(std::chrono::milliseconds(100));

    bootstrap.SetupEnvironment(environment);

    if (!bootstrap.ExecuteFromBootFile()) {
        cout{} << "Default start-up" << std::endl;

        if (!bootstrap.ExecuteFromJSON( R"(
                { "serious" : [{ "env" : [ "createSocketMan" ] }
                              ]
                } )"_json ))
        {
            cout{} << "Cannot recover from startup errors" << std::endl;
            goto End;
        }
    }

End:
    t1.join();
    
    environment->UnloadAll();

    delete environment;

    return 0;
}

TB_STARTFUNC_DEF(irisMain);