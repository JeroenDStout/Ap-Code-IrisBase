/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

    // This file must match with:
    //  * Layouts Protocol.h

export class Protocol {

	static Name_User_Persistent_Panel  = "user-persistent-panel";
    
    static Name_Action_Update_Item     = 'update-item';
    static Name_Action_Update_Children = 'update-children';
    static Name_Action_Create_Item     = 'create-item';

	static Type_Dummy                  = "dummy";
	static Type_Panel                  = "panel";
	static Type_Connexion              = "connexion";

	static Name_Connexion_Name         = "name";
	static Name_Connexion_Host         = "host";
	static Name_Connexion_Port         = "port";

}