/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#pragma once

#include "ToolboxBase/Pubc/Base Environment.h"

#include "IrisBase/Pubc/Interface Layouts.h"

namespace IrisBack {
namespace Connexion {

	struct KnownConnexion {
		std::string		Name, Icon;
		uint32			Port;
	};

	using KnownConnexionList = std::vector<KnownConnexion>;

	class ConnexionEnumerator {
	public:
		using Path = BlackRoot::IO::FilePath;

	protected:
		std::vector<KnownConnexion>	Known_Connexions;
		
	public:
		ConnexionEnumerator() { ; }

		void add_from_directory(Path);
		void remove_all();

		const KnownConnexionList & get_connexions() const;
	};

}
}