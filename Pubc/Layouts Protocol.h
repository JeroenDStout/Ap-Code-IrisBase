/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#pragma once

#include "BlackRoot/Pubc/JSON.h"
#include "BlackRoot/Pubc/UUID.h"

#include "IrisBase/Pubc/Iris Objects.h"

namespace IrisBack {
namespace Objects {
namespace Protocol {

	static const char * Name_User_Persistent_Panel  = "user-persistent-panel";

    static const char * Name_Action_Update_Item     = "update-item";
    static const char * Name_Action_Update_Children = "update-children";
    static const char * Name_Action_Create_Item     = "create-item";

	static const char * Type_Dummy                  = "dummy";
	static const char * Type_Panel                  = "panel";
	static const char * Type_Stream                 = "stream";
	static const char * Type_Widget                 = "widget";
	static const char * Type_Connexion              = "connexion";

	static const char * Name_Connexion_Name         = "name";
	static const char * Name_Connexion_Host         = "host";
	static const char * Name_Connexion_Port         = "port";
    
}
}
}